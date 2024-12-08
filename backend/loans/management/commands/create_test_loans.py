from django.core.management.base import BaseCommand
from django.utils import timezone
from loans.models import Borrower, Loan
from decimal import Decimal
import random
from faker import Faker

fake = Faker()

class Command(BaseCommand):
    help = 'Creates test loans and borrowers'

    def add_arguments(self, parser):
        parser.add_argument('count', type=int, help='Number of loans to create')

    def handle(self, *args, **options):
        count = options['count']
        self.stdout.write(f'Creating {count} test loans...')

        # Create borrowers and loans
        for i in range(count):
            # Create borrower with formatted phone number
            phone = f"{random.randint(100, 999)}-{random.randint(100, 999)}-{random.randint(1000, 9999)}"
            
            borrower = Borrower.objects.create(
                first_name=fake.first_name(),
                last_name=fake.last_name(),
                email=fake.email(),
                phone_number=phone,
                credit_score=random.randint(600, 850),
                annual_income=Decimal(random.randint(50000, 200000)),
                employment_status=random.choice(['Employed', 'Self-Employed', 'Business Owner']),
                property_type=random.choice(['Single Family', 'Condo', 'Townhouse']),
                property_use=random.choice(['Primary Residence', 'Investment', 'Second Home'])
            )

            # Create loan
            loan_amount = Decimal(random.randint(100000, 1000000))
            original_apr = Decimal(str(random.uniform(3.0, 7.0))).quantize(Decimal('0.01'))
            
            loan = Loan.objects.create(
                borrower=borrower,
                loan_amount=loan_amount,
                original_apr=original_apr,
                location=fake.state(),
                status='AVAILABLE',
                fico_score=borrower.credit_score,
                lead_type=random.choice(['GUARANTEED', 'COMPETITIVE']),
                loan_type=random.choice(['Conventional', 'FHA', 'VA']),
                loan_term=random.choice([180, 360]),  # 15 or 30 years
                property_value=loan_amount * Decimal('1.25'),  # 20% more than loan amount
                down_payment=loan_amount * Decimal('0.20'),  # 20% down
                monthly_payment=Decimal(random.randint(1000, 5000)),
                debt_to_income_ratio=Decimal(str(random.uniform(20, 45))).quantize(Decimal('0.01'))
            )

            # Calculate routing score for the loan
            loan.calculate_routing_score()

            self.stdout.write(f'Created loan #{loan.id} for {borrower.first_name} {borrower.last_name}') 