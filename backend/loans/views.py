from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, F
from django.utils import timezone
from datetime import timedelta
import logging
import random
from decimal import Decimal
from django.urls import path
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Loan, GuaranteedLeadAllocation, GuaranteedLeadAssignment
from .serializers import (
    LoanSerializer, GuaranteedLoanSerializer, CompetitiveLoanSerializer
)
from bidding.models import Bid
from bidding.serializers import BidSerializer
from notifications.models import Notification

logger = logging.getLogger(__name__)

class LoanViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = LoanSerializer
    
    def get_queryset(self):
        """
        Filter loans based on user role and status
        """
        user = self.request.user
        if not hasattr(user, 'loan_officer_profile') or not user.loan_officer_profile.is_active:
            return Loan.objects.none()

        return Loan.objects.filter(
            Q(guaranteed_assignment__loan_officer=user.loan_officer_profile) |
            Q(lead_type='COMPETITIVE', status='AVAILABLE')
        ).select_related('borrower', 'current_leader')

    def get_serializer_class(self):
        """
        Use different serializers based on loan type
        """
        if self.action == 'guaranteed_loans':
            return GuaranteedLoanSerializer
        elif self.action == 'competitive_loans':
            return CompetitiveLoanSerializer
        return self.serializer_class

    @action(detail=False, methods=['get'])
    def guaranteed_loans(self, request):
        """
        Get guaranteed loans for the loan officer
        """
        if not hasattr(request.user, 'loan_officer_profile'):
            return Response(
                {"error": "Only loan officers can access guaranteed loans"},
                status=status.HTTP_403_FORBIDDEN
            )

        if not request.user.loan_officer_profile.is_active:
            return Response(
                {"error": "Your loan officer profile is not active"},
                status=status.HTTP_403_FORBIDDEN
            )

        loan_officer = request.user.loan_officer_profile
        
        # Get current guaranteed loans
        guaranteed_loans = Loan.objects.filter(
            guaranteed_assignment__loan_officer=loan_officer,
            is_guaranteed=True,
            status='AVAILABLE'
        ).select_related('borrower')

        # If we have less than 3 guaranteed loans, get recommendations
        if guaranteed_loans.count() < 3:
            recommended_loans = loan_officer.get_guaranteed_loan_recommendations(
                limit=3 - guaranteed_loans.count()
            )
            # Combine current and recommended loans
            loans = list(guaranteed_loans) + list(recommended_loans)
        else:
            loans = guaranteed_loans

        serializer = self.get_serializer(loans, many=True)
        
        # Get allocation info
        allocation = GuaranteedLeadAllocation.objects.filter(
            loan_officer=loan_officer
        ).first()
        
        return Response({
            'loans': serializer.data,
            'credits_available': allocation.credits_available if allocation else 0,
            'credits_used': allocation.credits_used if allocation else 0,
            'reset_date': allocation.reset_date if allocation else None
        })

    @action(detail=False, methods=['get'])
    def competitive_loans(self, request):
        """
        Get all available competitive loans with filtering based on preferences
        """
        if not hasattr(request.user, 'loan_officer_profile'):
            return Response(
                {"error": "Only loan officers can access competitive loans"},
                status=status.HTTP_403_FORBIDDEN
            )

        if not request.user.loan_officer_profile.is_active:
            return Response(
                {"error": "Your loan officer profile is not active"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Start with base queryset
        loans = Loan.objects.filter(
            lead_type='COMPETITIVE',
            status='AVAILABLE',
            is_closed=False
        ).select_related('borrower', 'current_leader')

        # Get query parameters
        use_preferences = request.query_params.get('use_preferences', 'true').lower() == 'true'
        sort_by = request.query_params.get('sort_by', 'created_at')
        sort_order = request.query_params.get('sort_order', 'desc')

        # Get loan officer preferences
        try:
            preferences = request.user.loan_officer_profile.preferences
            if use_preferences and preferences:
                # Apply loan type filters
                loan_types = []
                if preferences.conventional_enabled:
                    loan_types.append('CONVENTIONAL')
                if preferences.fha_enabled:
                    loan_types.append('FHA')
                if preferences.va_enabled:
                    loan_types.append('VA')
                if preferences.jumbo_enabled:
                    loan_types.append('JUMBO')
                if loan_types:
                    loans = loans.filter(loan_type__in=loan_types)

                # Apply region filters if not open to all regions
                if not preferences.open_to_all_regions and preferences.regions:
                    loans = loans.filter(location__in=preferences.regions)

                # Apply loan amount range
                loans = loans.filter(
                    loan_amount__gte=preferences.min_loan_amount,
                    loan_amount__lte=preferences.max_loan_amount
                )

                # Apply FICO score range
                loans = loans.filter(
                    fico_score__gte=preferences.min_fico_score,
                    fico_score__lte=preferences.max_fico_score
                )

                # Apply APR threshold
                loans = loans.filter(original_apr__lte=preferences.max_apr_threshold)
        except Exception as e:
            logger.error(f"Error applying preferences: {e}")

        # Apply manual filters from query parameters
        location = request.query_params.get('location')
        min_fico = request.query_params.get('min_fico')
        max_fico = request.query_params.get('max_fico')
        min_amount = request.query_params.get('min_amount')
        max_amount = request.query_params.get('max_amount')
        max_apr = request.query_params.get('max_apr')
        loan_type = request.query_params.get('loan_type')

        if location:
            loans = loans.filter(location=location)
        if min_fico:
            loans = loans.filter(fico_score__gte=min_fico)
        if max_fico:
            loans = loans.filter(fico_score__lte=max_fico)
        if min_amount:
            loans = loans.filter(loan_amount__gte=min_amount)
        if max_amount:
            loans = loans.filter(loan_amount__lte=max_amount)
        if max_apr:
            loans = loans.filter(original_apr__lte=max_apr)
        if loan_type:
            loans = loans.filter(loan_type=loan_type)

        # Apply sorting
        sort_field = sort_by
        if sort_order == 'desc':
            sort_field = f'-{sort_field}'
        loans = loans.order_by(sort_field)

        serializer = self.get_serializer(loans, many=True)
        return Response({
            'loans': serializer.data,
            'total_count': loans.count(),
            'filtered_by_preferences': use_preferences
        })

    @action(detail=False, methods=['get'])
    def won_loans(self, request):
        """
        Get all loans won by the loan officer
        """
        if not hasattr(request.user, 'loan_officer_profile'):
            return Response(
                {"error": "Only loan officers can access won loans"},
                status=status.HTTP_403_FORBIDDEN
            )

        if not request.user.loan_officer_profile.is_active:
            return Response(
                {"error": "Your loan officer profile is not active"},
                status=status.HTTP_403_FORBIDDEN
            )

        loan_officer = request.user.loan_officer_profile
        loans = Loan.objects.filter(
            Q(guaranteed_assignment__loan_officer=loan_officer) |
            Q(winning_bid__loan_officer=loan_officer),
            is_closed=True
        ).select_related('borrower', 'winning_bid')

        serializer = self.get_serializer(loans, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def claim_guaranteed(self, request, pk=None):
        """
        Claim a loan as guaranteed
        """
        if not hasattr(request.user, 'loan_officer_profile'):
            return Response(
                {"error": "Only loan officers can claim guaranteed loans"},
                status=status.HTTP_403_FORBIDDEN
            )

        if not request.user.loan_officer_profile.is_active:
            return Response(
                {"error": "Your loan officer profile is not active"},
                status=status.HTTP_403_FORBIDDEN
            )

        loan = self.get_object()
        loan_officer = request.user.loan_officer_profile

        # Check if loan can be claimed
        if not loan.is_eligible_for_guaranteed():
            return Response(
                {"error": "This loan is not eligible for guaranteed assignment"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Try to assign the loan
        if loan.assign_to_guaranteed_pool(loan_officer):
            # Update performance metrics
            loan_officer.update_performance_metrics()
            serializer = self.get_serializer(loan)
            return Response(serializer.data)
        else:
            return Response(
                {"error": "Failed to claim loan. No credits available."},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def place_bid(self, request, pk=None):
        """Place a bid on a loan"""
        try:
            loan = self.get_object()
            loan_officer = request.user.loan_officer_profile
            
            # Validate bid_apr exists
            if 'bid_apr' not in request.data:
                return Response(
                    {'error': 'bid_apr is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                bid_apr = Decimal(str(request.data.get('bid_apr')))
            except (TypeError, ValueError):
                return Response(
                    {'error': 'Invalid bid_apr value'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate bid
            if loan.status != 'AVAILABLE':
                return Response(
                    {'error': 'This loan is not available for bidding'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if loan.lowest_bid_apr and bid_apr >= Decimal(str(loan.lowest_bid_apr)):
                return Response(
                    {'error': 'Bid must be lower than current lowest APR'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if bid_apr >= Decimal(str(loan.original_apr)):
                return Response(
                    {'error': 'Bid must be lower than original APR'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get current active bids to notify outbid users
            current_active_bids = Bid.objects.filter(
                loan=loan,
                status='ACTIVE'
            ).select_related('loan_officer__user')

            # Create bid
            bid = Bid.objects.create(
                loan=loan,
                loan_officer=loan_officer,
                bid_apr=bid_apr,
                status='ACTIVE'
            )

            # Update loan
            loan.lowest_bid_apr = bid_apr
            loan.current_leader = loan_officer
            loan.current_bid_count += 1
            loan.save()

            # Create notifications for outbid users
            for outbid in current_active_bids:
                if outbid.loan_officer != loan_officer:  # Don't notify the bidder
                    Notification.create_outbid_notification(
                        user=outbid.loan_officer.user,
                        loan=loan,
                        new_bid=bid
                    )
                    # Update outbid status
                    outbid.status = 'OUTBID'
                    outbid.is_lowest = False
                    outbid.save()

                    # Update outbid loan officer's metrics
                    outbid.loan_officer.update_performance_metrics()

            # Update current bidder's metrics
            loan_officer.update_performance_metrics()

            # Broadcast bid update to all connected WebSocket clients
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                'bids',
                {
                    'type': 'bid_update',
                    'loan_id': loan.id,
                    'new_lowest_apr': float(bid_apr),
                    'current_bid_count': loan.current_bid_count,
                    'current_leader': {
                        'id': loan_officer.id,
                        'user': {
                            'id': loan_officer.user.id,
                            'first_name': loan_officer.user.first_name,
                            'last_name': loan_officer.user.last_name,
                            'email': loan_officer.user.email,
                        }
                    }
                }
            )

            serializer = self.get_serializer(loan)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get bid history for the current user"""
        bids = Bid.objects.filter(
            loan_officer=request.user.loan_officer_profile
        ).order_by('-created_at')
        
        return Response([{
            'id': bid.id,
            'loan_id': bid.loan.id,
            'bid_apr': bid.bid_apr,
            'created_at': bid.created_at
        } for bid in bids])

class BidViewSet(viewsets.ModelViewSet):
    serializer_class = BidSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Bid.objects.filter(loan_officer=self.request.user.loan_officer_profile)

    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get bid history for the current user"""
        bids = self.get_queryset().order_by('-created_at')
        
        return Response([{
            'id': bid.id,
            'loan_id': bid.loan.id,
            'bid_apr': bid.bid_apr,
            'created_at': bid.created_at
        } for bid in bids])
