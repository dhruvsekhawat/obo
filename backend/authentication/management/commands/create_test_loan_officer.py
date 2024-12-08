from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from authentication.models import LoanOfficerProfile
from loans.models import GuaranteedLeadAllocation

User = get_user_model()

class Command(BaseCommand):
    help = 'Creates a test loan officer'

    def handle(self, *args, **options):
        # Create user
        email = 'loan.officer@test.com'
        password = 'testpass123'
        nmls_id = '12345'
        
        # Check if user exists
        user = User.objects.filter(email=email).first()
        if not user:
            user = User.objects.create_user(
                email=email,
                password=password,
                first_name='Test',
                last_name='Officer',
                role='LOAN_OFFICER'
            )
            self.stdout.write(self.style.SUCCESS(f'Created new user: {email}'))
        else:
            self.stdout.write(self.style.WARNING(f'User already exists: {email}'))
            user.set_password(password)
            user.save()

        # Check if loan officer profile exists
        loan_officer = LoanOfficerProfile.objects.filter(nmls_id=nmls_id).first()
        if loan_officer:
            # Update existing profile
            loan_officer.user = user
            loan_officer.company_name = 'Test Mortgage Co.'
            loan_officer.is_active = True
            loan_officer.preferred_locations = ['California', 'Texas', 'Florida']
            loan_officer.min_loan_amount = 100000
            loan_officer.max_loan_amount = 1000000
            loan_officer.min_credit_score = 680
            loan_officer.save()
            self.stdout.write(self.style.WARNING('Updated existing loan officer profile'))
        else:
            # Create new profile
            loan_officer = LoanOfficerProfile.objects.create(
                user=user,
                nmls_id=nmls_id,
                company_name='Test Mortgage Co.',
                is_active=True,
                preferred_locations=['California', 'Texas', 'Florida'],
                min_loan_amount=100000,
                max_loan_amount=1000000,
                min_credit_score=680
            )
            self.stdout.write(self.style.SUCCESS('Created new loan officer profile'))

        # Create or update guaranteed lead allocation
        allocation, created = GuaranteedLeadAllocation.objects.update_or_create(
            loan_officer=loan_officer,
            defaults={
                'credits_available': 3,
                'credits_used': 0,
                'reset_date': timezone.now() + timezone.timedelta(days=30)
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS('Created new guaranteed lead allocation'))
        else:
            self.stdout.write(self.style.WARNING('Updated existing guaranteed lead allocation'))

        self.stdout.write(
            self.style.SUCCESS(f'\nTest loan officer ready with:\nEmail: {email}\nPassword: {password}')
        ) 