from django.core.exceptions import ValidationError
from django.core.validators import validate_email
import re

def validate_email_address(email):
    """
    Validate email format and domain
    """
    try:
        validate_email(email)
    except ValidationError:
        raise ValidationError("Invalid email address format")
    
    # Add any additional email validation rules here
    # For example, checking for disposable email domains
    disposable_domains = ['tempmail.com', 'throwaway.com']  # Add more as needed
    domain = email.split('@')[1]
    if domain in disposable_domains:
        raise ValidationError("Email domain not allowed")
    
    return email

def validate_strong_password(password):
    """
    Additional password validation beyond Django's validators
    """
    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters long")
    
    if not re.search(r'[A-Z]', password):
        raise ValidationError("Password must contain at least one uppercase letter")
        
    if not re.search(r'[a-z]', password):
        raise ValidationError("Password must contain at least one lowercase letter")
        
    if not re.search(r'\d', password):
        raise ValidationError("Password must contain at least one number")
        
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise ValidationError("Password must contain at least one special character")
    
    return password

def validate_phone_number(phone):
    """
    Phone number validation
    """
    if phone:
        # Remove any non-digit characters
        phone = re.sub(r'\D', '', phone)
        
        # Check if it's a valid US phone number (10 digits)
        if len(phone) != 10:
            raise ValidationError("Phone number must be 10 digits")
        
        return phone
    return phone 