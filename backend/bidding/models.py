from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from core.constants import BID_STATUS_CHOICES

class Bid(models.Model):
    loan = models.ForeignKey(
        'loans.Loan',
        on_delete=models.CASCADE,
        related_name='bids'
    )
    loan_officer = models.ForeignKey(
        'authentication.LoanOfficerProfile',
        on_delete=models.CASCADE,
        related_name='bids'
    )
    bid_apr = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01')), MaxValueValidator(Decimal('99.99'))]
    )
    status = models.CharField(
        max_length=20,
        choices=BID_STATUS_CHOICES,
        default='PENDING'
    )
    is_lowest = models.BooleanField(default=False)
    is_final = models.BooleanField(default=False)
    rebid_count = models.IntegerField(default=0)
    is_exclusive_bid = models.BooleanField(default=False)
    competitive_bid_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('100.00')
    )
    
    # Additional bid details
    proposed_term = models.IntegerField(null=True, blank=True)  # in months
    proposed_monthly_payment = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    notes = models.TextField(blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Bid'
        verbose_name_plural = 'Bids'
        ordering = ['bid_apr', '-created_at']
        indexes = [
            models.Index(fields=['loan', 'bid_apr']),
            models.Index(fields=['loan_officer']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Bid #{self.id} - {self.loan_officer.user.email} on Loan #{self.loan.id}"

    def save(self, *args, **kwargs):
        # Check if this is the lowest bid
        if not self.pk:  # New bid
            lower_bids = Bid.objects.filter(
                loan=self.loan,
                bid_apr__lt=self.bid_apr,
                status='ACTIVE'
            ).exists()
            self.is_lowest = not lower_bids

        super().save(*args, **kwargs)

        # Update other bids if this is now the lowest
        if self.is_lowest:
            Bid.objects.filter(
                loan=self.loan
            ).exclude(id=self.id).update(is_lowest=False)

    def accept_bid(self):
        """Accept this bid as the winning bid"""
        self.status = 'ACCEPTED'
        self.is_final = True
        self.save()
        
        # Update the loan
        self.loan.status = 'CLOSED'
        self.loan.winning_bid = self
        self.loan.save()
        
        # Update other bids
        self.loan.bids.exclude(id=self.id).update(
            status='REJECTED',
            is_final=True
        )

    def can_rebid(self):
        """Check if loan officer can rebid on this loan"""
        return (
            not self.is_final and
            self.rebid_count < self.loan.max_bids and
            not self.loan.is_closed
        )
