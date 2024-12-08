from django.contrib import admin
from .models import Transaction, Subscription

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'loan_officer', 'transaction_type', 'amount', 'status', 'created_at')
    list_filter = ('transaction_type', 'status', 'created_at')
    search_fields = ('loan_officer__user__email', 'description', 'payment_id', 'stripe_charge_id')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Basic Info', {
            'fields': (
                'loan_officer',
                'transaction_type',
                'amount',
                'status',
                'description'
            )
        }),
        ('Related Items', {
            'fields': (
                'bid',
            )
        }),
        ('Payment Details', {
            'fields': (
                'payment_method',
                'payment_id',
                'stripe_charge_id'
            )
        }),
        ('Timestamps', {
            'fields': (
                'created_at',
                'updated_at',
                'completed_at'
            )
        }),
    )
    readonly_fields = ('created_at', 'updated_at', 'completed_at')

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('loan_officer', 'plan', 'status', 'amount', 'start_date', 'end_date')
    list_filter = ('plan', 'status', 'billing_cycle', 'created_at')
    search_fields = ('loan_officer__user__email', 'stripe_subscription_id', 'stripe_customer_id')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Basic Info', {
            'fields': (
                'loan_officer',
                'plan',
                'status',
                'amount',
                'billing_cycle'
            )
        }),
        ('Stripe Details', {
            'fields': (
                'stripe_subscription_id',
                'stripe_customer_id'
            )
        }),
        ('Dates', {
            'fields': (
                'start_date',
                'end_date',
                'cancelled_at'
            )
        }),
        ('Timestamps', {
            'fields': (
                'created_at',
                'updated_at'
            )
        }),
    )
    readonly_fields = ('created_at', 'updated_at')
