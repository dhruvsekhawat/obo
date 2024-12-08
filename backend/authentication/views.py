from django.shortcuts import render
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.models import Q
from .serializers import UserSerializer, UserDetailSerializer, LoanOfficerPreferencesSerializer, LoanOfficerProfileSerializer, LoanOfficerProfileUpdateSerializer
import logging
import os
from google.oauth2 import id_token
from google.auth.transport import requests
from rest_framework.views import APIView
from .models import LoanOfficerPreferences, LoanOfficerProfile
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)

User = get_user_model()

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                
                # Generate tokens for immediate login
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)

                return Response({
                    'success': True,
                    'message': 'Registration successful',
                    'access': access_token,
                    'refresh': str(refresh),
                    'user': UserDetailSerializer(user).data
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({
                    'success': False,
                    'message': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        logger.info(f"Login attempt for user: {email}")
        
        try:
            # Get user details
            user = User.objects.get(email=email)
            
            # Try to get the token
            response = super().post(request, *args, **kwargs)
            
            logger.info(f"Login successful - User: {email}")
            
            # Return success response with user details
            return Response({
                "success": True,
                "message": "Login successful!",
                "access": response.data['access'],
                "refresh": response.data['refresh'],
                "user": UserDetailSerializer(user).data
            })
        except User.DoesNotExist:
            logger.warning(f"Login failed - User not found: {email}")
            return Response({
                "error": "user_not_found",
                "message": "No account found with this email. Please check your credentials or register."
            }, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"Login failed - Invalid credentials for user: {email}")
            return Response({
                "error": "invalid_credentials",
                "message": "Invalid password. Please check your password and try again."
            }, status=status.HTTP_401_UNAUTHORIZED)

class UserDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data)

class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        try:
            token = request.data.get('token')
            if not token:
                return Response({
                    'success': False,
                    'message': 'Token is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            idinfo = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                os.getenv('GOOGLE_OAUTH2_KEY')
            )

            email = idinfo['email']
            google_id = idinfo['sub']

            # Check if user exists
            try:
                user = User.objects.get(email=email)
                # Update Google ID if not set
                if not user.google_id:
                    user.google_id = google_id
                    user.save()
            except User.DoesNotExist:
                # Create new user
                user = User.objects.create_user(
                    email=email,
                    first_name=idinfo.get('given_name', ''),
                    last_name=idinfo.get('family_name', ''),
                    role='LOAN_OFFICER',
                    google_id=google_id,
                    is_verified=True
                )

            # Ensure loan officer profile exists and is active
            loan_officer_profile, created = LoanOfficerProfile.objects.get_or_create(
                user=user,
                defaults={
                    'nmls_id': f"G{google_id[:8]}",
                    'company_name': "Individual Broker",
                    'is_active': True,
                    'subscription_plan': 'BASIC',
                    'profile_completed': False
                }
            )

            # If profile exists but isn't active, activate it
            if not created and not loan_officer_profile.is_active:
                loan_officer_profile.is_active = True
                loan_officer_profile.subscription_plan = 'BASIC'
                loan_officer_profile.save()

            # Ensure preferences exist
            LoanOfficerPreferences.objects.get_or_create(
                loan_officer=loan_officer_profile,
                defaults={
                    'min_loan_amount': 100000,
                    'max_loan_amount': 1000000,
                    'min_fico_score': 620,
                    'max_fico_score': 850,
                    'max_apr_threshold': 7.00,
                    'notify_guaranteed_loans': True,
                    'notify_competitive_loans': True,
                    'notify_bid_updates': True,
                    'communicate_via_email': True,
                    'communicate_via_dashboard': True
                }
            )

            # Check profile completion
            loan_officer_profile.check_profile_completion()

            # Generate tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)

            logger.info(f"Google login successful for user: {email}")

            return Response({
                'success': True,
                'message': 'Successfully authenticated with Google',
                'access': access_token,
                'refresh': str(refresh),
                'user': UserDetailSerializer(user).data,
                'profile_completed': loan_officer_profile.profile_completed
            })

        except ValueError as e:
            logger.error(f"Google token validation error: {str(e)}")
            return Response({
                'success': False,
                'message': 'Invalid token'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Google authentication error: {str(e)}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class LoanOfficerPreferencesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'loan_officer_profile'):
            return Response({
                "error": "Only loan officers can access preferences"
            }, status=status.HTTP_403_FORBIDDEN)

        try:
            preferences = LoanOfficerPreferences.objects.get(
                loan_officer=request.user.loan_officer_profile
            )
        except LoanOfficerPreferences.DoesNotExist:
            preferences = LoanOfficerPreferences.objects.create(
                loan_officer=request.user.loan_officer_profile,
                min_loan_amount=100000,
                max_loan_amount=1000000,
                min_fico_score=620,
                max_fico_score=850,
                max_apr_threshold=7.00,
                notify_guaranteed_loans=True,
                notify_competitive_loans=True,
                notify_bid_updates=True,
                communicate_via_email=True,
                communicate_via_dashboard=True
            )

        serializer = LoanOfficerPreferencesSerializer(preferences)
        return Response(serializer.data)

    def put(self, request):
        if not hasattr(request.user, 'loan_officer_profile'):
            return Response({
                "error": "Only loan officers can update preferences"
            }, status=status.HTTP_403_FORBIDDEN)

        try:
            preferences = LoanOfficerPreferences.objects.get(
                loan_officer=request.user.loan_officer_profile
            )
        except LoanOfficerPreferences.DoesNotExist:
            preferences = LoanOfficerPreferences.objects.create(
                loan_officer=request.user.loan_officer_profile,
                min_loan_amount=100000,
                max_loan_amount=1000000,
                min_fico_score=620,
                max_fico_score=850,
                max_apr_threshold=7.00,
                notify_guaranteed_loans=True,
                notify_competitive_loans=True,
                notify_bid_updates=True,
                communicate_via_email=True,
                communicate_via_dashboard=True
            )

        serializer = LoanOfficerPreferencesSerializer(preferences, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoanOfficerProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'loan_officer_profile'):
            return Response({
                "error": "Loan officer profile not found"
            }, status=status.HTTP_404_NOT_FOUND)

        profile = request.user.loan_officer_profile
        serializer = LoanOfficerProfileSerializer(profile)
        return Response(serializer.data)

    def put(self, request):
        if not hasattr(request.user, 'loan_officer_profile'):
            return Response({
                "error": "Loan officer profile not found"
            }, status=status.HTTP_404_NOT_FOUND)

        profile = request.user.loan_officer_profile
        serializer = LoanOfficerProfileUpdateSerializer(profile, data=request.data)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'profile': LoanOfficerProfileSerializer(profile).data,
                'profile_completed': profile.profile_completed
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
