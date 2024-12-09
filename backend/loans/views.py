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
        Get all available competitive loans
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

        loans = Loan.objects.filter(
            lead_type='COMPETITIVE',
            status='AVAILABLE',
            is_closed=False
        ).select_related('borrower', 'current_leader')

        serializer = self.get_serializer(loans, many=True)
        return Response(serializer.data)

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
