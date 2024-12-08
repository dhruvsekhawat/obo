from django.contrib import admin
from .models import Borrower, Loan, GuaranteedLeadAllocation, GuaranteedLeadAssignment

@admin.register(Borrower)
class BorrowerAdmin(admin.ModelAdmin):
    list_display = ('get_full_name', 'email', 'credit_score', 'annual_income')
    list_filter = ('created_at',)
    search_fields = ('first_name', 'last_name', 'email')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Personal Info', {
            'fields': (
                'first_name',
                'last_name',
                'email',
                'phone_number'
            )
        }),
        ('Financial Info', {
            'fields': (
                'credit_score',
                'annual_income',
                'employment_status'
            )
        }),
        ('Property Info', {
            'fields': (
                'property_type',
                'property_use'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    readonly_fields = ('created_at', 'updated_at')

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    get_full_name.short_description = 'Full Name'

@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ('id', 'borrower', 'loan_amount', 'status', 'lead_type', 'current_leader')
    list_filter = ('status', 'lead_type', 'is_guaranteed', 'is_closed', 'created_at')
    search_fields = ('borrower__email', 'location')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Basic Info', {
            'fields': (
                'borrower',
                'loan_amount',
                'original_apr',
                'location',
                'status',
                'lead_type'
            )
        }),
        ('Loan Details', {
            'fields': (
                'loan_type',
                'loan_term',
                'property_value',
                'down_payment',
                'monthly_payment',
                'debt_to_income_ratio',
                'fico_score'
            )
        }),
        ('Bidding Info', {
            'fields': (
                'lowest_bid_apr',
                'max_bids',
                'current_bid_count',
                'is_guaranteed',
                'current_leader',
                'is_closed',
                'winning_bid'
            )
        }),
        ('Documents', {
            'fields': (
                'loan_estimate_document',
                'additional_documents'
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

@admin.register(GuaranteedLeadAllocation)
class GuaranteedLeadAllocationAdmin(admin.ModelAdmin):
    list_display = ('loan_officer', 'credits_available', 'credits_used', 'reset_date')
    list_filter = ('reset_date', 'created_at')
    search_fields = ('loan_officer__user__email',)
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {
            'fields': (
                'loan_officer',
                'credits_available',
                'credits_used',
                'reset_date'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    readonly_fields = ('created_at', 'updated_at')

@admin.register(GuaranteedLeadAssignment)
class GuaranteedLeadAssignmentAdmin(admin.ModelAdmin):
    list_display = ('loan', 'loan_officer', 'assigned_at')
    list_filter = ('assigned_at',)
    search_fields = ('loan_officer__user__email', 'loan__borrower__email')
    ordering = ('-assigned_at',)
    
    fieldsets = (
        (None, {
            'fields': (
                'loan',
                'loan_officer',
                'assigned_at'
            )
        }),
    )
    readonly_fields = ('assigned_at',)
