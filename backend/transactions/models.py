from django.db import models
from decimal import Decimal
from django.core.validators import MinValueValidator

class Transaction(models.Model):
    TRANSACTION_TYPES = (
        ('SUBSCRIPTION', 'Subscription Payment'),
        ('BID_FEE', 'Competitive Bid Fee'),
        ('REFUND', 'Refund'),
        ('OTHER', 'Other'),
    )

    PAYMENT_STATUS = (
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('REFUNDED', 'Refunded'),
    )

    loan_officer = models.ForeignKey(
        'authentication.LoanOfficerProfile',
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPES
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS,
        default='PENDING'
    )
    description = models.CharField(max_length=255)
    
    # Optional relations
    bid = models.ForeignKey(
        'bidding.Bid',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )
    
    # Payment details
    payment_method = models.CharField(max_length=50, blank=True)
    payment_id = models.CharField(max_length=100, blank=True)  # External payment ID
    stripe_charge_id = models.CharField(max_length=100, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Transaction'
        verbose_name_plural = 'Transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['loan_officer']),
            models.Index(fields=['transaction_type']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.transaction_type} - ${self.amount} ({self.status})"

    def mark_as_completed(self):
        """Mark the transaction as completed"""
        from django.utils import timezone
        self.status = 'COMPLETED'
        self.completed_at = timezone.now()
        self.save()

    def process_refund(self):
        """Process a refund for this transaction"""
        if self.status != 'COMPLETED':
            raise ValueError("Can only refund completed transactions")
        
        # Create refund transaction
        refund = Transaction.objects.create(
            loan_officer=self.loan_officer,
            transaction_type='REFUND',
            amount=self.amount,
            description=f"Refund for transaction #{self.id}",
            bid=self.bid,
            payment_method=self.payment_method
        )
        
        self.status = 'REFUNDED'
        self.save()
        
        return refund

class Subscription(models.Model):
    SUBSCRIPTION_STATUS = (
        ('ACTIVE', 'Active'),
        ('CANCELLED', 'Cancelled'),
        ('EXPIRED', 'Expired'),
        ('PENDING', 'Pending'),
    )

    loan_officer = models.OneToOneField(
        'authentication.LoanOfficerProfile',
        on_delete=models.CASCADE,
        related_name='subscription'
    )
    plan = models.CharField(max_length=20)  # Basic, Premium, etc.
    status = models.CharField(
        max_length=20,
        choices=SUBSCRIPTION_STATUS,
        default='PENDING'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )
    billing_cycle = models.CharField(
        max_length=20,
        default='MONTHLY'
    )
    
    # Stripe specific fields
    stripe_subscription_id = models.CharField(max_length=100, blank=True)
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    
    # Timestamps
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Subscription'
        verbose_name_plural = 'Subscriptions'
        indexes = [
            models.Index(fields=['loan_officer']),
            models.Index(fields=['status']),
            models.Index(fields=['end_date']),
        ]

    def __str__(self):
        return f"{self.loan_officer.user.email} - {self.plan} ({self.status})"

    def cancel(self):
        """Cancel the subscription"""
        from django.utils import timezone
        self.status = 'CANCELLED'
        self.cancelled_at = timezone.now()
        self.save()

    def is_active(self):
        """Check if subscription is active"""
        from django.utils import timezone
        return (
            self.status == 'ACTIVE' and
            self.start_date <= timezone.now() <= self.end_date
        )
