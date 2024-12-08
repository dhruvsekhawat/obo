from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from core.constants import LOAN_STATUS_CHOICES, LEAD_TYPE_CHOICES

class Borrower(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(max_length=255)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    credit_score = models.IntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(300), MaxValueValidator(850)]
    )
    annual_income = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    employment_status = models.CharField(max_length=50, blank=True)
    property_type = models.CharField(max_length=50, blank=True)
    property_use = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Borrower'
        verbose_name_plural = 'Borrowers'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['credit_score']),
            models.Index(fields=['annual_income']),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    def get_active_loans(self):
        return self.loans.filter(is_closed=False)

class Loan(models.Model):
    borrower = models.ForeignKey(
        Borrower,
        on_delete=models.CASCADE,
        related_name='loans'
    )
    loan_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    original_apr = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=5.00
    )
    location = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=LOAN_STATUS_CHOICES,
        default='AVAILABLE'
    )
    fico_score = models.IntegerField(
        validators=[MinValueValidator(300), MaxValueValidator(850)],
        default=700
    )
    lead_type = models.CharField(
        max_length=20,
        choices=LEAD_TYPE_CHOICES,
        default='COMPETITIVE'
    )
    lowest_bid_apr = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )
    max_bids = models.IntegerField(default=10)
    current_bid_count = models.IntegerField(default=0)
    is_guaranteed = models.BooleanField(default=False)
    current_leader = models.ForeignKey(
        'authentication.LoanOfficerProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='leading_loans'
    )
    is_closed = models.BooleanField(default=False)
    winning_bid = models.OneToOneField(
        'bidding.Bid',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='won_loan'
    )
    
    # Additional loan details
    loan_type = models.CharField(max_length=50, blank=True)  # e.g., Conventional, FHA, VA
    loan_term = models.IntegerField(null=True, blank=True)  # in months
    property_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    down_payment = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    monthly_payment = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    debt_to_income_ratio = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Document tracking
    loan_estimate_document = models.URLField(blank=True)
    additional_documents = models.JSONField(default=list, blank=True)
    
    # Timestamps
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Fields for routing logic
    routing_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Score used for routing decisions"
    )
    routing_priority = models.IntegerField(
        default=0,
        help_text="Priority score for guaranteed loan allocation"
    )
    auto_assignment_attempts = models.IntegerField(
        default=0,
        help_text="Number of times the system attempted to auto-assign this loan"
    )

    class Meta:
        verbose_name = 'Loan'
        verbose_name_plural = 'Loans'
        indexes = [
            models.Index(fields=['borrower']),
            models.Index(fields=['status']),
            models.Index(fields=['lead_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Loan #{self.id} - ${self.loan_amount} ({self.status})"

    def get_ltv_ratio(self):
        """Calculate Loan to Value ratio"""
        if self.property_value and self.property_value > 0:
            return (self.loan_amount / self.property_value) * 100
        return None

    def is_eligible_for_guaranteed(self):
        """Check if loan is eligible for guaranteed pool based on criteria"""
        if self.is_closed or self.status != 'AVAILABLE':
            return False
            
        # Basic eligibility criteria
        min_credit_score = 680
        max_loan_amount = 1000000
        
        return (
            self.fico_score >= min_credit_score and
            self.loan_amount <= max_loan_amount and
            not self.is_guaranteed and
            self.lead_type != 'COMPETITIVE'
        )

    def calculate_routing_score(self):
        """Calculate a score for routing decisions"""
        from decimal import Decimal
        
        # Base score starts at 100
        score = Decimal('100')
        
        # Credit score factor (0-20 points)
        score += Decimal(str(min((self.fico_score - 600) / 10, 20)))
        
        # Loan amount factor (0-20 points)
        amount_score = Decimal(str(min(float(self.loan_amount) / 50000, 20)))
        score += amount_score
        
        # Debt to income factor (0-20 points)
        if self.debt_to_income_ratio:
            dti_score = Decimal(str(max(20 - float(self.debt_to_income_ratio) / 2, 0)))
            score += dti_score
        
        self.routing_score = score
        self.save(update_fields=['routing_score'])
        return score

    def assign_to_guaranteed_pool(self, loan_officer):
        """Attempt to assign this loan to a loan officer's guaranteed pool"""
        from django.db import transaction
        
        with transaction.atomic():
            allocation = loan_officer.guaranteed_allocation
            
            if not allocation.has_credits_available():
                return False
                
            # Create guaranteed assignment
            GuaranteedLeadAssignment.objects.create(
                loan=self,
                loan_officer=loan_officer
            )
            
            # Update loan status
            self.is_guaranteed = True
            self.lead_type = 'GUARANTEED'
            self.save()
            
            # Decrement credits
            allocation.credits_used += 1
            allocation.credits_available -= 1
            allocation.save()
            
            return True

    def convert_to_competitive(self):
        """Convert a guaranteed loan to competitive if not claimed"""
        if self.is_guaranteed:
            self.is_guaranteed = False
            self.lead_type = 'COMPETITIVE'
            self.save()
            
            # Remove any guaranteed assignment
            GuaranteedLeadAssignment.objects.filter(loan=self).delete()
            
            return True
        return False

    def get_current_best_offer(self):
        """Get the current best offer for this loan"""
        return self.bids.filter(status='ACTIVE').order_by('bid_apr').first()

class GuaranteedLeadAllocation(models.Model):
    loan_officer = models.OneToOneField(
        'authentication.LoanOfficerProfile',
        on_delete=models.CASCADE,
        related_name='guaranteed_allocation'
    )
    credits_available = models.IntegerField(default=3)
    credits_used = models.IntegerField(default=0)
    reset_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Guaranteed Lead Allocation'
        verbose_name_plural = 'Guaranteed Lead Allocations'

    def __str__(self):
        return f"{self.loan_officer.user.email} - {self.credits_available} credits available"

    def has_credits_available(self):
        return self.credits_available > 0

class GuaranteedLeadAssignment(models.Model):
    loan = models.OneToOneField(
        Loan,
        on_delete=models.CASCADE,
        related_name='guaranteed_assignment'
    )
    loan_officer = models.ForeignKey(
        'authentication.LoanOfficerProfile',
        on_delete=models.CASCADE,
        related_name='guaranteed_leads'
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Guaranteed Lead Assignment'
        verbose_name_plural = 'Guaranteed Lead Assignments'

    def __str__(self):
        return f"Loan #{self.loan.id} assigned to {self.loan_officer.user.email}"
