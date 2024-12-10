from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.core import serializers
import json

class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('OUTBID', 'Outbid'),
        ('BID_WON', 'Bid Won'),
        ('BID_LOST', 'Bid Lost'),
        ('LOAN_EXPIRED', 'Loan Expired'),
        ('NEW_LOAN', 'New Loan'),
        ('LOAN_STATUS_CHANGE', 'Loan Status Change'),
        ('LOAN_ASSIGNMENT', 'Loan Assignment'),
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

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new and self.user.loan_officer_profile.preferences.communicate_via_dashboard:
            self.send_websocket_notification()

    def send_websocket_notification(self):
        """Send notification through WebSocket."""
        channel_layer = get_channel_layer()
        notification_data = {
            'id': self.id,
            'type': self.notification_type,
            'title': self.title,
            'message': self.message,
            'created_at': self.created_at.isoformat(),
            'is_read': self.is_read,
            'object_id': self.object_id,
        }
        
        async_to_sync(channel_layer.group_send)(
            f'notifications_{self.user.id}',
            {
                'type': 'notification_message',
                'message': notification_data
            }
        )

    @classmethod
    def create_outbid_notification(cls, user, loan, new_bid):
        """Create a notification for a user who has been outbid"""
        content_type = ContentType.objects.get_for_model(loan)
        
        notification = cls.objects.create(
            user=user,
            notification_type='OUTBID',
            title='You have been outbid!',
            message=f'Your bid on loan #{loan.id} has been outbid. The new lowest APR is {new_bid.bid_apr}%. Place a new bid to stay competitive!',
            content_type=content_type,
            object_id=loan.id
        )
        
        return notification 

    @classmethod
    def create_new_loan_notification(cls, user, loan):
        """Create a notification for a new loan in the system"""
        content_type = ContentType.objects.get_for_model(loan)
        
        notification = cls.objects.create(
            user=user,
            notification_type='NEW_LOAN',
            title='New Loan Available!',
            message=f'A new {loan.loan_type} loan for ${loan.loan_amount:,.2f} is now available in {loan.location}.',
            content_type=content_type,
            object_id=loan.id
        )
        
        return notification

    @classmethod
    def create_loan_status_notification(cls, user, loan, old_status, new_status):
        """Create a notification for a loan status change"""
        content_type = ContentType.objects.get_for_model(loan)
        
        notification = cls.objects.create(
            user=user,
            notification_type='LOAN_STATUS_CHANGE',
            title='Loan Status Updated',
            message=f'Loan #{loan.id} status has changed from {old_status} to {new_status}.',
            content_type=content_type,
            object_id=loan.id
        )
        
        return notification

    @classmethod
    def create_loan_assignment_notification(cls, user, loan):
        """Create a notification when a loan is assigned to a loan officer"""
        content_type = ContentType.objects.get_for_model(loan)
        
        notification = cls.objects.create(
            user=user,
            notification_type='LOAN_ASSIGNMENT',
            title='New Loan Assignment',
            message=f'A new {loan.loan_type} loan (#{loan.id}) has been assigned to you.',
            content_type=content_type,
            object_id=loan.id
        )
        
        return notification