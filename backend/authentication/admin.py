from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, LoanOfficerProfile

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'role', 'is_active', 'is_staff')
    list_filter = ('role', 'is_active', 'is_staff', 'created_at')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone_number')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    readonly_fields = ('created_at', 'updated_at')
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'first_name', 'last_name', 'role'),
        }),
    )

@admin.register(LoanOfficerProfile)
class LoanOfficerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'nmls_id', 'company_name', 'subscription_plan', 'is_active')
    list_filter = ('subscription_plan', 'is_active', 'created_at')
    search_fields = ('user__email', 'nmls_id', 'company_name')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('user', 'nmls_id', 'company_name')}),
        ('Subscription', {'fields': ('subscription_plan', 'is_active')}),
        ('Performance', {'fields': ('total_loans_funded', 'success_rate')}),
        ('Profile Details', {
            'fields': (
                'date_of_birth',
                'license_expiry',
                'years_of_experience',
                'specialties',
                'service_areas',
                'bio',
                'profile_image'
            )
        }),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
    readonly_fields = ('created_at', 'updated_at')
