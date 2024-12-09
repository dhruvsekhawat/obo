from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import random
from faker import Faker

from loans.models import Loan, Borrower

fake = Faker()

class Command(BaseCommand):
    help = 'Creates test loans for development'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=10, help='Number of loans to create')

    def handle(self, *args, **options):
        count = options['count']
        self.stdout.write(f'Creating {count} test loans...')
        
        # Create test borrowers
        borrowers = []
        for i in range(count):
            phone = f"{random.randint(100, 999)}-{random.randint(100, 999)}-{random.randint(1000, 9999)}"
            credit_score = random.randint(620, 850)
            
            borrower = Borrower.objects.create(
                first_name=fake.first_name(),
                last_name=fake.last_name(),
                email=fake.email(),
                phone_number=phone,
                credit_score=credit_score,
                annual_income=Decimal(random.randint(50000, 200000)),
                employment_status=random.choice(['EMPLOYED', 'SELF_EMPLOYED', 'BUSINESS_OWNER']),
                property_type=random.choice(['SINGLE_FAMILY', 'CONDO', 'TOWNHOUSE']),
                property_use=random.choice(['PRIMARY_RESIDENCE', 'INVESTMENT', 'SECOND_HOME'])
            )
            borrowers.append(borrower)
            self.stdout.write(f'Created borrower: {borrower.first_name} {borrower.last_name}')
        
        # Create loans
        loan_types = ['CONVENTIONAL', 'FHA', 'VA', 'JUMBO']
        locations = ['CA', 'TX', 'FL', 'NY', 'IL', 'WA', 'MA', 'CO']
        
        for i in range(count):
            loan_amount = Decimal(random.randint(200000, 1000000))
            original_apr = Decimal(str(random.uniform(3.0, 7.0))).quantize(Decimal('0.01'))
            property_value = loan_amount * Decimal('1.25')  # 20% more than loan amount
            down_payment = property_value * Decimal('0.20')  # 20% down
            monthly_payment = (loan_amount * (original_apr/100/12) * (1 + original_apr/100/12)**360) / ((1 + original_apr/100/12)**360 - 1)
            
            # Determine if loan should be guaranteed based on criteria
            borrower = random.choice(borrowers)
            is_guaranteed = (
                borrower.credit_score >= 680 and
                loan_amount <= 1000000 and
                random.random() < 0.3  # 30% chance of being guaranteed if eligible
            )
            
            loan = Loan.objects.create(
                borrower=borrower,
                loan_amount=loan_amount,
                original_apr=original_apr,
                location=random.choice(locations),
                status='AVAILABLE',
                fico_score=borrower.credit_score,
                lead_type='GUARANTEED' if is_guaranteed else 'COMPETITIVE',
                is_guaranteed=is_guaranteed,
                loan_type=random.choice(loan_types),
                loan_term=360,  # 30 years
                property_value=property_value,
                down_payment=down_payment,
                monthly_payment=monthly_payment.quantize(Decimal('0.01')),
                debt_to_income_ratio=Decimal(str(random.uniform(20, 45))).quantize(Decimal('0.01')),
                expires_at=timezone.now() + timedelta(days=random.randint(5, 30)),
                max_bids=10,
                current_bid_count=0
            )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Created loan #{loan.id} - {loan.loan_type} {"(Guaranteed)" if is_guaranteed else "(Competitive)"} '
                    f'for {borrower.first_name} {borrower.last_name}'
                )
            )