from rest_framework import serializers
from .models import UploadedDocument

class UploadedDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedDocument
        fields = [
            'id', 'file', 'original_filename', 'uploaded_at', 
            'processed', 'processing_errors',
            'extracted_name', 'extracted_apr', 
            'extracted_loan_amount', 'extracted_loan_term',
            'extracted_loan_type', 'confidence_score'
        ]
        read_only_fields = [
            'id', 'uploaded_at', 'processed', 'processing_errors',
            'extracted_name', 'extracted_apr', 
            'extracted_loan_amount', 'extracted_loan_term',
            'extracted_loan_type', 'confidence_score'
        ]

class DocumentExtractResponseSerializer(serializers.Serializer):
    """Serializer for the response from document extraction"""
    document_id = serializers.IntegerField()
    filename = serializers.CharField()
    extracted_data = serializers.DictField()
    
class LoanCreationSerializer(serializers.Serializer):
    """Serializer for loan creation from borrower form submission"""
    # Document reference
    document_id = serializers.IntegerField(required=False, allow_null=True)
    
    # Borrower information
    name = serializers.CharField(max_length=255, required=True, help_text="Full name of the borrower")
    email = serializers.EmailField(required=True, help_text="Email address for notifications and correspondence")
    phone = serializers.CharField(max_length=20, required=True, help_text="Phone number for SMS notifications")
    credit_score = serializers.IntegerField(required=False, min_value=300, max_value=850, default=700, help_text="FICO credit score (300-850)")
    annual_income = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=75000.00, help_text="Annual income in dollars")
    
    # Loan details
    apr = serializers.DecimalField(max_digits=5, decimal_places=2, required=True, help_text="Annual Percentage Rate (APR)")
    interest_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True, help_text="Loan interest rate")
    loan_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=True, help_text="Principal loan amount in dollars")
    loan_term = serializers.IntegerField(required=True, help_text="Loan term in years")
    loan_type = serializers.CharField(max_length=50, required=False, default='CONVENTIONAL', help_text="Type of loan (e.g., CONVENTIONAL, FHA, VA)")
    monthly_payment = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True, help_text="Monthly loan payment in dollars")
    
    # Property information
    property_type = serializers.CharField(max_length=50, required=False, default='SINGLE_FAMILY', help_text="Type of property (e.g., SINGLE_FAMILY, CONDO)")
    property_use = serializers.CharField(max_length=50, required=False, default='PRIMARY_RESIDENCE', help_text="Property usage (e.g., PRIMARY_RESIDENCE, INVESTMENT)")
    property_value = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True, help_text="Estimated property value in dollars")
    down_payment = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True, help_text="Down payment amount in dollars")
    location = serializers.CharField(max_length=255, required=False, default='US', help_text="Location of the property")
    
    # Notification preferences
    notify_by_email = serializers.BooleanField(default=True, help_text="Whether to receive notifications by email")
    notify_by_sms = serializers.BooleanField(default=True, help_text="Whether to receive notifications by SMS")
    
    # Form requirements
    terms_accepted = serializers.BooleanField(required=True, help_text="Acceptance of terms and conditions")
    
    def validate(self, data):
        """Validate the loan creation data"""
        # Ensure terms are accepted
        if not data.get('terms_accepted', False):
            raise serializers.ValidationError("You must accept the terms and conditions")
        
        # Ensure we have at least one notification method
        if not data.get('notify_by_email', True) and not data.get('notify_by_sms', True):
            raise serializers.ValidationError("At least one notification method (email or SMS) is required")
        
        # If SMS notifications are enabled, ensure phone number is provided
        if data.get('notify_by_sms', True) and not data.get('phone'):
            raise serializers.ValidationError("Phone number is required for SMS notifications")
            
        # If email notifications are enabled, ensure email is provided
        if data.get('notify_by_email', True) and not data.get('email'):
            raise serializers.ValidationError("Email address is required for email notifications")
        
        # Validate property value and down payment if provided
        loan_amount = data.get('loan_amount')
        property_value = data.get('property_value')
        down_payment = data.get('down_payment')
        
        # If property value is not provided, estimate it
        if not property_value and loan_amount:
            data['property_value'] = loan_amount * 1.25
        
        # If down payment is not provided, estimate it
        if not down_payment and loan_amount:
            data['down_payment'] = loan_amount * 0.2
            
        return data 