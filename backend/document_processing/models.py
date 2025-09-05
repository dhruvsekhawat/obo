from django.db import models
import uuid
import os
from django.conf import settings

def document_upload_path(instance, filename):
    """Generate a unique path for uploaded documents"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('documents', filename)

class UploadedDocument(models.Model):
    """Model for storing uploaded loan documents"""
    file = models.FileField(upload_to=document_upload_path)
    original_filename = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed = models.BooleanField(default=False)
    processing_errors = models.TextField(blank=True, null=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_documents'
    )
    
    # Extracted data fields
    extracted_name = models.CharField(max_length=255, blank=True, null=True)
    extracted_co_borrower_name = models.CharField(max_length=255, blank=True, null=True)
    extracted_document_date = models.CharField(max_length=20, blank=True, null=True)
    extracted_apr = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    extracted_interest_rate = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    extracted_loan_amount = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    extracted_loan_term = models.IntegerField(blank=True, null=True)
    extracted_loan_type = models.CharField(max_length=50, blank=True, null=True)
    extracted_monthly_payment = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    extracted_monthly_mortgage_insurance = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    extracted_monthly_escrow = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    extracted_closing_costs = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    extracted_cash_to_close = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    extracted_loan_purpose = models.CharField(max_length=50, blank=True, null=True)
    
    # Processing metadata
    processing_time_ms = models.FloatField(blank=True, null=True)
    confidence_score = models.FloatField(blank=True, null=True)
    model_used = models.CharField(max_length=100, blank=True, null=True)
    
    # Relationship fields
    created_loan = models.ForeignKey(
        'loans.Loan',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_documents'
    )
    
    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['uploaded_at']),
            models.Index(fields=['processed']),
            models.Index(fields=['uploaded_by']),
        ]
    
    def __str__(self):
        return f"Document {self.id}: {self.original_filename}"
