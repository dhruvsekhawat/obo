from rest_framework import serializers
from .models import Loan, Borrower, GuaranteedLeadAssignment
from authentication.serializers import LoanOfficerProfileSerializer
from bidding.models import Bid

class BorrowerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Borrower
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone_number',
            'credit_score', 'annual_income', 'employment_status',
            'property_type', 'property_use'
        ]

class LoanSerializer(serializers.ModelSerializer):
    borrower = BorrowerSerializer(read_only=True)
    current_leader = LoanOfficerProfileSerializer(read_only=True)
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Loan
        fields = [
            'id', 'borrower', 'loan_amount', 'original_apr', 'location',
            'status', 'fico_score', 'lead_type', 'lowest_bid_apr',
            'max_bids', 'current_bid_count', 'is_guaranteed',
            'current_leader', 'loan_type', 'loan_term', 'property_value',
            'down_payment', 'monthly_payment', 'debt_to_income_ratio',
            'days_remaining', 'created_at'
        ]

    def get_days_remaining(self, obj):
        if obj.expires_at:
            from django.utils import timezone
            delta = obj.expires_at - timezone.now()
            return max(0, delta.days)
        return None

class GuaranteedLoanSerializer(LoanSerializer):
    """Serializer for guaranteed loans with additional fields"""
    routing_score = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    
    class Meta(LoanSerializer.Meta):
        fields = LoanSerializer.Meta.fields + ['routing_score', 'routing_priority']

class CompetitiveLoanSerializer(LoanSerializer):
    """Serializer for competitive loans with bidding-specific fields"""
    current_best_offer = serializers.SerializerMethodField()
    my_current_bid = serializers.SerializerMethodField()
    
    class Meta(LoanSerializer.Meta):
        fields = LoanSerializer.Meta.fields + [
            'current_best_offer', 'my_current_bid'
        ]
    
    def get_current_best_offer(self, obj):
        best_bid = obj.get_current_best_offer()
        if best_bid:
            return {
                'apr': best_bid.bid_apr,
                'loan_officer': best_bid.loan_officer.user.get_full_name()
            }
        return None
    
    def get_my_current_bid(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            loan_officer = request.user.loan_officer_profile
            current_bid = obj.bids.filter(
                loan_officer=loan_officer,
                status='ACTIVE'
            ).first()
            if current_bid:
                return {
                    'apr': current_bid.bid_apr,
                    'is_winning': current_bid.is_lowest
                }
        return None 

class BidSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bid
        fields = ['id', 'loan', 'loan_officer', 'bid_apr', 'created_at', 'updated_at']
        read_only_fields = ['loan_officer', 'created_at', 'updated_at'] 