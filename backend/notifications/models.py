from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.conf import settings

class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('OUTBID', 'Outbid'),
        ('BID_WON', 'Bid Won'),
        ('BID_LOST', 'Bid Lost'),
        ('LOAN_EXPIRED', 'Loan Expired'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPES
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    
    # For linking to related objects (loans, bids, etc.)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['is_read']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.notification_type} - {self.user.email} - {self.created_at}"

    @classmethod
    def create_outbid_notification(cls, user, loan, new_bid):
        """Create a notification for a user who has been outbid"""
        content_type = ContentType.objects.get_for_model(loan)
        
        return cls.objects.create(
            user=user,
            notification_type='OUTBID',
            title='You have been outbid!',
            message=f'Your bid on loan #{loan.id} has been outbid. The new lowest APR is {new_bid.bid_apr}%. Place a new bid to stay competitive!',
            content_type=content_type,
            object_id=loan.id
        ) 