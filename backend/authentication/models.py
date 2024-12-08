from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
from loans.models import Loan

# Role and subscription choices
ROLE_CHOICES = [
    ('ADMIN', 'Admin'),
    ('LOAN_OFFICER', 'Loan Officer'),
    ('BORROWER', 'Borrower')
]

SUBSCRIPTION_CHOICES = [
    ('FREE', 'Free'),
    ('BASIC', 'Basic'),
    ('PREMIUM', 'Premium')
]

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'ADMIN')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

class CustomUser(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Google OAuth fields
    google_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    google_access_token = models.TextField(null=True, blank=True)
    google_refresh_token = models.TextField(null=True, blank=True)
    google_token_expiry = models.DateTimeField(null=True, blank=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f"{self.email} ({self.role})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

class LoanOfficerProfile(models.Model):
    user = models.OneToOneField(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name='loan_officer_profile'
    )
    nmls_id = models.CharField(
        max_length=50, 
        unique=True, 
        help_text='Loan officer NMLS ID'
    )
    company_name = models.CharField(max_length=255, null=True, blank=True)
    subscription_plan = models.CharField(
        max_length=20, 
        choices=SUBSCRIPTION_CHOICES, 
        default='BASIC'
    )
    total_loans_funded = models.IntegerField(default=0)
    success_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    date_of_birth = models.DateField(null=True, blank=True)
    license_expiry = models.DateField(null=True, blank=True)
    years_of_experience = models.IntegerField(default=0)
    specialties = models.JSONField(default=list, blank=True)
    service_areas = models.JSONField(default=list, blank=True)
    bio = models.TextField(blank=True)
    profile_image = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    profile_completed = models.BooleanField(
        default=False,
        help_text="Whether the loan officer has completed their profile"
    )
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    # Loan preferences
    preferred_locations = models.JSONField(
        default=list,
        help_text="List of preferred locations (states/cities)"
    )
    min_loan_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Minimum preferred loan amount"
    )
    max_loan_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Maximum preferred loan amount"
    )
    min_credit_score = models.IntegerField(
        null=True,
        blank=True,
        help_text="Minimum preferred credit score"
    )
    
    # Historical performance
    total_loans_won = models.IntegerField(default=0)
    total_guaranteed_leads = models.IntegerField(default=0)
    total_competitive_wins = models.IntegerField(default=0)
    average_loan_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    success_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Percentage of won loans vs total attempts"
    )

    class Meta:
        verbose_name = 'Loan Officer Profile'
        verbose_name_plural = 'Loan Officer Profiles'
        indexes = [
            models.Index(fields=['nmls_id']),
            models.Index(fields=['subscription_plan']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} - NMLS: {self.nmls_id}"

    def get_subscription_status(self):
        return {
            'plan': self.subscription_plan,
            'is_active': self.is_active,
        }

    def update_success_rate(self):
        # Logic to calculate success rate based on funded loans
        if self.total_loans_funded > 0:
            # Example calculation - you can modify this based on your needs
            successful_loans = self.bids.filter(status='ACCEPTED').count()
            self.success_rate = (successful_loans / self.total_loans_funded) * 100
            self.save()

    def matches_loan_criteria(self, loan):
        """Check if a loan matches this officer's preferences"""
        if not loan.is_eligible_for_guaranteed():
            return False
            
        # Check loan amount
        if self.min_loan_amount and loan.loan_amount < self.min_loan_amount:
            return False
        if self.max_loan_amount and loan.loan_amount > self.max_loan_amount:
            return False
            
        # Check credit score
        if self.min_credit_score and loan.fico_score < self.min_credit_score:
            return False
            
        # Check location
        if self.preferred_locations and loan.location not in self.preferred_locations:
            return False
            
        return True

    def update_performance_metrics(self):
        """Update historical performance metrics"""
        from django.db.models import Avg, Count
        
        # Get all won loans
        won_loans = self.bids.filter(status='ACCEPTED')
        guaranteed_leads = self.guaranteed_leads.all()
        
        # Update counts
        self.total_loans_won = won_loans.count()
        self.total_guaranteed_leads = guaranteed_leads.count()
        self.total_competitive_wins = won_loans.exclude(
            loan__in=guaranteed_leads.values_list('loan', flat=True)
        ).count()
        
        # Calculate average loan amount
        avg_amount = won_loans.aggregate(
            avg_amount=Avg('loan__loan_amount')
        )['avg_amount']
        self.average_loan_amount = avg_amount if avg_amount else 0
        
        # Calculate success rate
        total_attempts = self.bids.count() + self.total_guaranteed_leads
        if total_attempts > 0:
            self.success_rate = (self.total_loans_won / total_attempts) * 100
        
        self.save()

    def get_guaranteed_loan_recommendations(self, limit=3):
        """Get recommended loans for guaranteed allocation"""
        from django.db.models import Q
        
        # Get available loans that match preferences
        matching_loans = Loan.objects.filter(
            status='AVAILABLE',
            is_guaranteed=False,
            lead_type='AVAILABLE'
        ).exclude(
            guaranteed_assignment__isnull=False
        )
        
        # Apply preferences
        if self.min_loan_amount:
            matching_loans = matching_loans.filter(
                loan_amount__gte=self.min_loan_amount
            )
        if self.max_loan_amount:
            matching_loans = matching_loans.filter(
                loan_amount__lte=self.max_loan_amount
            )
        if self.min_credit_score:
            matching_loans = matching_loans.filter(
                fico_score__gte=self.min_credit_score
            )
        if self.preferred_locations:
            matching_loans = matching_loans.filter(
                location__in=self.preferred_locations
            )
        
        # Order by routing score and return top matches
        return matching_loans.order_by('-routing_score')[:limit]

    def check_profile_completion(self):
        """Check if all required fields are filled"""
        required_fields = [
            self.nmls_id and not self.nmls_id.startswith(('G', 'R')),  # Not temporary ID
            self.company_name,
            self.years_of_experience is not None,
            self.phone_number,
            hasattr(self, 'preferences')  # Has preferences set
        ]
        self.profile_completed = all(required_fields)
        self.save(update_fields=['profile_completed'] if self.pk else None)
        return self.profile_completed

class LoanOfficerPreferences(models.Model):
    loan_officer = models.OneToOneField(
        'LoanOfficerProfile',
        on_delete=models.CASCADE,
        related_name='preferences'
    )
    # Loan Types
    conventional_enabled = models.BooleanField(default=True)
    fha_enabled = models.BooleanField(default=True)
    va_enabled = models.BooleanField(default=True)
    jumbo_enabled = models.BooleanField(default=True)
    priority_loan_type = models.CharField(
        max_length=20,
        choices=[
            ('conventional', 'Conventional'),
            ('fha', 'FHA'),
            ('va', 'VA'),
            ('jumbo', 'Jumbo')
        ],
        default='conventional'
    )

    # Geographic Preferences
    regions = models.JSONField(default=list)  # List of state codes
    open_to_all_regions = models.BooleanField(default=True)

    # Loan Amount Range
    min_loan_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=100000,
        validators=[MinValueValidator(0)]
    )
    max_loan_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=1000000,
        validators=[MinValueValidator(0)]
    )

    # FICO Score Range
    min_fico_score = models.IntegerField(
        default=620,
        validators=[MinValueValidator(300), MaxValueValidator(850)]
    )
    max_fico_score = models.IntegerField(
        default=850,
        validators=[MinValueValidator(300), MaxValueValidator(850)]
    )

    # APR Threshold
    max_apr_threshold = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=7.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )

    # Notification Preferences
    notify_guaranteed_loans = models.BooleanField(default=True)
    notify_competitive_loans = models.BooleanField(default=True)
    notify_bid_updates = models.BooleanField(default=True)

    # Communication Preferences
    communicate_via_email = models.BooleanField(default=True)
    communicate_via_sms = models.BooleanField(default=True)
    communicate_via_dashboard = models.BooleanField(default=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Preferences for {self.loan_officer.user.email}"

    class Meta:
        verbose_name = "Loan Officer Preferences"
        verbose_name_plural = "Loan Officer Preferences"

    def to_dict(self):
        """Convert preferences to dictionary format matching frontend structure"""
        return {
            'loan_types': {
                'conventional': self.conventional_enabled,
                'fha': self.fha_enabled,
                'va': self.va_enabled,
                'jumbo': self.jumbo_enabled,
                'priority': self.priority_loan_type
            },
            'regions': self.regions,
            'open_to_all_regions': self.open_to_all_regions,
            'min_loan_amount': float(self.min_loan_amount),
            'max_loan_amount': float(self.max_loan_amount),
            'min_fico_score': self.min_fico_score,
            'max_fico_score': self.max_fico_score,
            'max_apr_threshold': float(self.max_apr_threshold),
            'notification_preferences': {
                'guaranteed_loans': self.notify_guaranteed_loans,
                'competitive_loans': self.notify_competitive_loans,
                'bid_updates': self.notify_bid_updates
            },
            'communication_preferences': {
                'email': self.communicate_via_email,
                'sms': self.communicate_via_sms,
                'dashboard': self.communicate_via_dashboard
            }
        }

    @classmethod
    def from_dict(cls, data, loan_officer):
        """Create or update preferences from dictionary data"""
        preferences, created = cls.objects.get_or_create(
            loan_officer=loan_officer
        )

        # Update loan types
        loan_types = data.get('loan_types', {})
        preferences.conventional_enabled = loan_types.get('conventional', True)
        preferences.fha_enabled = loan_types.get('fha', True)
        preferences.va_enabled = loan_types.get('va', True)
        preferences.jumbo_enabled = loan_types.get('jumbo', True)
        preferences.priority_loan_type = loan_types.get('priority', 'conventional')

        # Update regions
        preferences.regions = data.get('regions', [])
        preferences.open_to_all_regions = data.get('open_to_all_regions', True)

        # Update loan amount range
        preferences.min_loan_amount = data.get('min_loan_amount', 100000)
        preferences.max_loan_amount = data.get('max_loan_amount', 1000000)

        # Update FICO score range
        preferences.min_fico_score = data.get('min_fico_score', 620)
        preferences.max_fico_score = data.get('max_fico_score', 850)

        # Update APR threshold
        preferences.max_apr_threshold = data.get('max_apr_threshold', 7.00)

        # Update notification preferences
        notification_prefs = data.get('notification_preferences', {})
        preferences.notify_guaranteed_loans = notification_prefs.get('guaranteed_loans', True)
        preferences.notify_competitive_loans = notification_prefs.get('competitive_loans', True)
        preferences.notify_bid_updates = notification_prefs.get('bid_updates', True)

        # Update communication preferences
        communication_prefs = data.get('communication_preferences', {})
        preferences.communicate_via_email = communication_prefs.get('email', True)
        preferences.communicate_via_sms = communication_prefs.get('sms', True)
        preferences.communicate_via_dashboard = communication_prefs.get('dashboard', True)

        preferences.save()
        return preferences
