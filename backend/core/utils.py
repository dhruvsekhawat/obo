import logging
import re

class SanitizeSensitiveDataFilter(logging.Filter):
    """
    Filter to sanitize sensitive data like passwords from logs.
    """
    SENSITIVE_FIELDS = [
        'password', 'password1', 'password2',
        'token', 'access', 'refresh',
        'credit_card', 'ssn', 'secret'
    ]

    def filter(self, record):
        if hasattr(record, 'msg') and isinstance(record.msg, str):
            for field in self.SENSITIVE_FIELDS:
                if field in record.msg.lower():
                    record.msg = self.sanitize_string(record.msg, field)

        if hasattr(record, 'args'):
            if isinstance(record.args, dict):
                record.args = {
                    key: ('***' if key in self.SENSITIVE_FIELDS else value)
                    for key, value in record.args.items()
                }
            elif isinstance(record.args, (tuple, list)):
                record.args = tuple(
                    '***' if isinstance(arg, str) and any(field in arg.lower() 
                    for field in self.SENSITIVE_FIELDS) else arg
                    for arg in record.args
                )
        return True

    def sanitize_string(self, text, field):
        """Sanitize sensitive data in string while preserving structure"""
        pattern = rf'(["\']?{field}["\']?\s*[:=]\s*["\']?)[^"\',\s}}]+(["\']?)'
        return re.sub(pattern, r'\1***\2', text, flags=re.IGNORECASE)

def get_client_ip(request):
    """
    Get client IP address from request
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def format_phone_number(phone):
    """
    Format phone number to (XXX) XXX-XXXX
    """
    if not phone:
        return phone
    
    # Remove any non-digit characters
    phone = re.sub(r'\D', '', phone)
    
    if len(phone) == 10:
        return f"({phone[:3]}) {phone[3:6]}-{phone[6:]}"
    return phone 