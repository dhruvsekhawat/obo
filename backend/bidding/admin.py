from django.contrib import admin
from .models import Bid

@admin.register(Bid)
class BidAdmin(admin.ModelAdmin):
    list_display = ('id', 'loan', 'loan_officer', 'bid_apr', 'status', 'is_lowest', 'is_final')
    list_filter = ('status', 'is_lowest', 'is_final', 'created_at')
    search_fields = ('loan_officer__user__email', 'loan__borrower__email')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Basic Info', {
            'fields': (
                'loan',
                'loan_officer',
                'bid_apr',
                'status'
            )
        }),
        ('Bid Details', {
            'fields': (
                'is_lowest',
                'is_final',
                'rebid_count',
                'is_exclusive_bid',
                'competitive_bid_fee'
            )
        }),
        ('Proposal Details', {
            'fields': (
                'proposed_term',
                'proposed_monthly_payment',
                'notes'
            )
        }),
        ('Timestamps', {
            'fields': (
                'expires_at',
                'created_at',
                'updated_at'
            )
        }),
    )
    readonly_fields = ('created_at', 'updated_at')

    def save_model(self, request, obj, form, change):
        if not change:  # New bid
            # Check if this is the lowest bid
            lower_bids = Bid.objects.filter(
                loan=obj.loan,
                bid_apr__lt=obj.bid_apr,
                status='ACTIVE'
            ).exists()
            obj.is_lowest = not lower_bids

        super().save_model(request, obj, form, change)

        # Update other bids if this is now the lowest
        if obj.is_lowest:
            Bid.objects.filter(
                loan=obj.loan
            ).exclude(id=obj.id).update(is_lowest=False)
