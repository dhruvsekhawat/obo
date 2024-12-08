ROLE_CHOICES = (
    ('LOAN_OFFICER', 'Loan Officer'),
    ('ADMIN', 'Admin'),
)

SUBSCRIPTION_CHOICES = (
    ('BASIC', 'Basic'),
    ('PREMIUM', 'Premium'),
    ('ENTERPRISE', 'Enterprise'),
)

LOAN_STATUS_CHOICES = (
    ('NEW', 'New'),
    ('AVAILABLE', 'Available'),
    ('IN_PROGRESS', 'In Progress'),
    ('PENDING', 'Pending'),
    ('APPROVED', 'Approved'),
    ('CLOSED', 'Closed'),
    ('EXPIRED', 'Expired'),
)

LEAD_TYPE_CHOICES = (
    ('GUARANTEED', 'Guaranteed'),
    ('COMPETITIVE', 'Competitive'),
)

BID_STATUS_CHOICES = (
    ('PENDING', 'Pending'),
    ('ACTIVE', 'Active'),
    ('WINNING', 'Winning'),
    ('OUTBID', 'Outbid'),
    ('EXPIRED', 'Expired'),
    ('REJECTED', 'Rejected'),
    ('ACCEPTED', 'Accepted'),
)

EVENT_TYPES = (
    ('BID_PLACED', 'Bid Placed'),
    ('BID_WON', 'Bid Won'),
    ('LOAN_CLOSED', 'Loan Closed'),
    ('CREDIT_USED', 'Credit Used'),
    ('PAYMENT_MADE', 'Payment Made'),
) 