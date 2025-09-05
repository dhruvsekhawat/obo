import logging
import re
import os
import time
import hashlib
import json
import base64
from decimal import Decimal
from typing import Dict, Any, List, Tuple, Optional
from pathlib import Path
from datetime import datetime
from django.db import transaction

try:
    import google.generativeai as genai
    from pydantic import BaseModel, Field
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logging.warning("Google Generative AI package not installed. Using fallback extraction.")

logger = logging.getLogger(__name__)

# Try to get API key from environment
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY', '')
GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-1.5-flash')
GEMINI_LITE_MODEL = os.environ.get('GEMINI_LITE_MODEL', 'gemini-1.5-flash-latest')

# Configure the Gemini API if available
if GEMINI_AVAILABLE and GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# Define structured output schema using Pydantic if available
if GEMINI_AVAILABLE:
    class LoanEstimateData(BaseModel):
        """Schema for structured loan estimate data extraction."""
        borrower_name: str = Field(description="Full name of the primary borrower")
        co_borrower_name: Optional[str] = Field(description="Full name of the co-borrower if present", default=None)
        document_date: str = Field(description="Date when the loan estimate was issued (MM/DD/YYYY)")
        loan_amount: float = Field(description="Principal loan amount in dollars")
        interest_rate: float = Field(description="Annual interest rate as a percentage")
        apr: float = Field(description="Annual Percentage Rate as a percentage")
        loan_term: int = Field(description="Loan term in years")
        loan_type: str = Field(description="Type of loan (e.g., Conventional, FHA, VA)")
        monthly_payment: float = Field(description="Regular monthly principal and interest payment")
        monthly_mortgage_insurance: Optional[float] = Field(description="Monthly mortgage insurance payment", default=None)
        monthly_escrow: Optional[float] = Field(description="Monthly escrow payment for taxes and insurance", default=None)
        closing_costs: Optional[float] = Field(description="Total estimated closing costs", default=None)
        cash_to_close: Optional[float] = Field(description="Estimated cash required at closing", default=None)
        loan_purpose: Optional[str] = Field(description="Purpose of the loan (e.g., Purchase, Refinance)", default=None)


class GeminiExtractionService:
    """Service for extracting data from loan estimate PDFs using Gemini 2.0 Flash."""
    
    def __init__(self, use_lite_model: bool = False):
        """Initialize the extraction service.
        
        Args:
            use_lite_model: Whether to use the lighter, faster model variant.
        """
        if not GEMINI_AVAILABLE or not GOOGLE_API_KEY:
            raise ImportError("Gemini extraction not available. Install required packages and set API key.")
            
        self.model_name = GEMINI_LITE_MODEL if use_lite_model else GEMINI_MODEL
        self.model = genai.GenerativeModel(self.model_name)
        logger.info(f"Initialized extraction service with model: {self.model_name}")
    
    def _calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA-256 hash of a file for caching and deduplication.
        
        Args:
            file_path: Path to the file.
            
        Returns:
            SHA-256 hash of the file.
        """
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def _read_pdf_as_base64(self, file_path: str) -> Dict[str, Any]:
        """Read a PDF file and convert it to a base64-encoded string for Gemini.
        
        Args:
            file_path: Path to the PDF file.
            
        Returns:
            Dictionary with MIME type and base64-encoded data.
        """
        with open(file_path, "rb") as f:
            pdf_bytes = f.read()
        
        pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")
        
        return {
            "mime_type": "application/pdf",
            "data": pdf_base64
        }
    
    def extract_data(self, pdf_path: str) -> Tuple[Dict[str, Any], float, float]:
        """Extract data from a loan estimate PDF.
        
        Args:
            pdf_path: Path to the PDF file.
            
        Returns:
            Tuple containing:
                - Extracted loan data as a dictionary
                - Processing time in milliseconds
                - Confidence score (0-1)
        """
        start_time = time.time()
        
        try:
            # Calculate file hash for potential caching
            file_hash = self._calculate_file_hash(pdf_path)
            logger.info(f"Processing file with hash: {file_hash}")
            
            # Read the PDF file as base64
            pdf_content = self._read_pdf_as_base64(pdf_path)
            
            # Create extraction prompt with structured format instructions
            extraction_prompt = """
            Extract the key financial and borrower information from this loan estimate document.
            Focus on the following fields:
            - Borrower name(s)
            - Document date
            - Loan amount
            - Interest rate
            - APR (Annual Percentage Rate)
            - Loan term (in years)
            - Loan type
            - Monthly payment
            - Monthly mortgage insurance (if present)
            - Monthly escrow payment (if present)
            - Closing costs
            - Cash to close
            - Loan purpose
            
            Return the data in a structured JSON format with the following fields:
            {
                "borrower_name": "Full name of the primary borrower",
                "co_borrower_name": "Full name of the co-borrower if present, or null if none",
                "document_date": "Date when the loan estimate was issued (MM/DD/YYYY)",
                "loan_amount": "Principal loan amount in dollars as a number",
                "interest_rate": "Annual interest rate as a percentage number",
                "apr": "Annual Percentage Rate as a percentage number",
                "loan_term": "Loan term in years as a number",
                "loan_type": "Type of loan (e.g., Conventional, FHA, VA)",
                "monthly_payment": "Regular monthly principal and interest payment as a number",
                "monthly_mortgage_insurance": "Monthly mortgage insurance payment as a number, or null if none",
                "monthly_escrow": "Monthly escrow payment for taxes and insurance as a number, or null if none",
                "closing_costs": "Total estimated closing costs as a number, or null if not specified",
                "cash_to_close": "Estimated cash required at closing as a number, or null if not specified",
                "loan_purpose": "Purpose of the loan (e.g., Purchase, Refinance), or null if not specified"
            }
            
            Be precise with numbers and dates. If a field is not found in the document, return null for that field.
            Format your response as valid JSON only, with no additional text before or after the JSON object.
            """
            
            # Generate response
            response = self.model.generate_content(
                contents=[
                    {
                        "parts": [
                            {"text": extraction_prompt},
                            {"inline_data": pdf_content}
                        ]
                    }
                ]
            )
            
            # Parse the JSON response
            response_text = response.text
            try:
                # First try direct JSON parsing
                response_json = json.loads(response_text)
            except json.JSONDecodeError:
                # If the response is not valid JSON, try to extract JSON from the text
                import re
                # Look for JSON in code blocks
                json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', response_text, re.DOTALL)
                if json_match:
                    try:
                        response_json = json.loads(json_match.group(1))
                    except json.JSONDecodeError:
                        # Try to find any JSON-like structure in the text
                        json_match = re.search(r'({.*})', response_text, re.DOTALL)
                        if json_match:
                            response_json = json.loads(json_match.group(1))
                        else:
                            logger.error(f"Could not extract JSON from response: {response_text}")
                            raise ValueError("Could not extract JSON from response")
                else:
                    # Try to find any JSON-like structure in the text
                    json_match = re.search(r'({.*})', response_text, re.DOTALL)
                    if json_match:
                        response_json = json.loads(json_match.group(1))
                    else:
                        logger.error(f"Could not extract JSON from response: {response_text}")
                        raise ValueError("Could not extract JSON from response")
            
            # Create loan data dictionary
            loan_data = response_json
            
            # Validate required fields
            required_fields = ['borrower_name', 'loan_amount', 'apr', 'loan_term']
            missing_fields = [field for field in required_fields if not loan_data.get(field)]
            if missing_fields:
                logger.warning(f"Missing required fields in extraction: {missing_fields}")
            
            # Calculate processing time
            processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            # Calculate confidence score based on completeness of extraction
            total_fields = 14  # Total number of possible fields
            filled_fields = sum(1 for k, v in loan_data.items() if v is not None)
            confidence_score = min(0.95, filled_fields / total_fields * 0.95)  # Cap at 0.95
            
            logger.info(f"Data extracted in {processing_time:.2f} milliseconds with confidence {confidence_score:.2f}")
            
            return loan_data, processing_time, confidence_score
            
        except Exception as e:
            logger.error(f"Error extracting data: {str(e)}")
            # Calculate processing time even for failed attempts
            processing_time = (time.time() - start_time) * 1000
            raise
    
    def extract_data_with_fallback(self, pdf_path: str) -> Tuple[Dict[str, Any], float, float, str]:
        """Extract data with fallback to standard model if lite model fails.
        
        Args:
            pdf_path: Path to the PDF file.
            
        Returns:
            Tuple containing:
                - Extracted loan data as a dictionary
                - Processing time in milliseconds
                - Confidence score (0-1)
                - Model used for extraction
        """
        try:
            # Try with current model (lite or standard)
            loan_data, processing_time, confidence_score = self.extract_data(pdf_path)
            return loan_data, processing_time, confidence_score, self.model_name
        except Exception as e:
            # If using lite model and it fails, try with standard model
            if self.model_name == GEMINI_LITE_MODEL:
                logger.warning(f"Lite model failed, falling back to standard model: {str(e)}")
                # Create new instance with standard model
                standard_service = GeminiExtractionService(use_lite_model=False)
                loan_data, processing_time, confidence_score = standard_service.extract_data(pdf_path)
                return loan_data, processing_time, confidence_score, GEMINI_MODEL
            else:
                # If already using standard model, re-raise the exception
                raise


class DocumentProcessor:
    """Service for processing uploaded documents and extracting loan information."""
    
    @staticmethod
    def process_document(document):
        """Process an uploaded document and extract loan information.
        
        Args:
            document: The UploadedDocument instance to process.
            
        Returns:
            Dictionary containing extracted data.
        """
        start_time = time.time()
        
        # Get the file path
        file_path = document.file.path
        
        # Check if the file is a PDF
        if file_path.lower().endswith('.pdf'):
            try:
                # Try to use Gemini extraction if available
                if GEMINI_AVAILABLE and GOOGLE_API_KEY:
                    logger.info(f"Using Gemini extraction for document {document.id}")
                    
                    try:
                        # Create extraction service with lite model for faster processing
                        extraction_service = GeminiExtractionService(use_lite_model=True)
                        
                        # Extract data with fallback to standard model if needed
                        loan_data, processing_time, confidence, model_used = extraction_service.extract_data_with_fallback(file_path)
                        
                        # Store all extracted data in the document
                        document.extracted_name = loan_data.get('borrower_name')
                        document.extracted_co_borrower_name = loan_data.get('co_borrower_name')
                        document.extracted_document_date = loan_data.get('document_date')
                        document.extracted_apr = Decimal(str(loan_data.get('apr'))) if loan_data.get('apr') else None
                        document.extracted_interest_rate = Decimal(str(loan_data.get('interest_rate'))) if loan_data.get('interest_rate') else None
                        document.extracted_loan_amount = Decimal(str(loan_data.get('loan_amount'))) if loan_data.get('loan_amount') else None
                        document.extracted_loan_term = loan_data.get('loan_term')
                        document.extracted_loan_type = loan_data.get('loan_type')
                        document.extracted_monthly_payment = Decimal(str(loan_data.get('monthly_payment'))) if loan_data.get('monthly_payment') else None
                        document.extracted_monthly_mortgage_insurance = Decimal(str(loan_data.get('monthly_mortgage_insurance'))) if loan_data.get('monthly_mortgage_insurance') else None
                        document.extracted_monthly_escrow = Decimal(str(loan_data.get('monthly_escrow'))) if loan_data.get('monthly_escrow') else None
                        document.extracted_closing_costs = Decimal(str(loan_data.get('closing_costs'))) if loan_data.get('closing_costs') else None
                        document.extracted_cash_to_close = Decimal(str(loan_data.get('cash_to_close'))) if loan_data.get('cash_to_close') else None
                        document.extracted_loan_purpose = loan_data.get('loan_purpose')
                        document.processing_time_ms = processing_time
                        document.confidence_score = confidence
                        document.model_used = model_used
                        
                        # Save the document with extracted data
                        document.save()
                        
                        # Create extracted data dictionary for response
                        extracted_data = {
                            'name': loan_data.get('borrower_name'),
                            'apr': Decimal(str(loan_data.get('apr'))) if loan_data.get('apr') else None,
                            'interest_rate': Decimal(str(loan_data.get('interest_rate'))) if loan_data.get('interest_rate') else None,
                            'loan_amount': Decimal(str(loan_data.get('loan_amount'))) if loan_data.get('loan_amount') else None,
                            'loan_term': loan_data.get('loan_term'),
                            'loan_type': loan_data.get('loan_type'),
                            'monthly_payment': Decimal(str(loan_data.get('monthly_payment'))) if loan_data.get('monthly_payment') else None,
                            'confidence': confidence
                        }
                        
                        logger.info(f"Successfully extracted data from document {document.id} using Gemini")
                        return extracted_data
                    except Exception as e:
                        logger.error(f"Gemini extraction failed for document {document.id}: {str(e)}")
                        logger.info(f"Falling back to placeholder data for document {document.id}")
                        return DocumentProcessor._extract_placeholder_data(document)
                else:
                    # Fallback to placeholder data if Gemini is not available
                    logger.warning("Gemini extraction not available, using placeholder data")
                    return DocumentProcessor._extract_placeholder_data(document)
            except Exception as e:
                # Log the error and fall back to placeholder data
                logger.error(f"Error extracting data from document {document.id}: {str(e)}")
                return DocumentProcessor._extract_placeholder_data(document)
        else:
            # For non-PDF files, use placeholder data
            logger.warning(f"Unsupported file format for document {document.id}, using placeholder data")
            return DocumentProcessor._extract_placeholder_data(document)
    
    @staticmethod
    def _extract_placeholder_data(document):
        """Extract placeholder data for testing or when extraction fails.
        
        Args:
            document: The UploadedDocument instance.
            
        Returns:
            Dictionary containing placeholder data.
        """
        # Generate some placeholder data
        placeholder_data = {
            'name': 'John Doe',
            'apr': Decimal('3.5'),
            'interest_rate': Decimal('3.25'),
            'loan_amount': Decimal('250000'),
            'loan_term': 30,
            'loan_type': 'CONVENTIONAL',
            'monthly_payment': Decimal('1087.62'),
            'confidence': 0.5
        }
        
        # Store placeholder data in the document
        document.extracted_name = placeholder_data['name']
        document.extracted_apr = placeholder_data['apr']
        document.extracted_interest_rate = placeholder_data['interest_rate']
        document.extracted_loan_amount = placeholder_data['loan_amount']
        document.extracted_loan_term = placeholder_data['loan_term']
        document.extracted_loan_type = placeholder_data['loan_type']
        document.extracted_monthly_payment = placeholder_data['monthly_payment']
        document.extracted_co_borrower_name = None
        document.extracted_document_date = datetime.now().strftime('%m/%d/%Y')
        document.extracted_monthly_mortgage_insurance = None
        document.extracted_monthly_escrow = None
        document.extracted_closing_costs = None
        document.extracted_cash_to_close = None
        document.extracted_loan_purpose = 'Purchase'
        document.processing_time_ms = 100.0
        document.confidence_score = placeholder_data['confidence']
        document.model_used = 'placeholder'
        
        # Save the document with placeholder data
        document.save()
        
        logger.info(f"Using placeholder data for document {document.id}")
        return placeholder_data


class LoanCreationService:
    """Service for creating loan and borrower records from extracted document data."""
    
    @staticmethod
    @transaction.atomic
    def create_from_document(document, user=None, additional_data=None):
        """Create loan and borrower records from an uploaded document.
        
        Args:
            document: The UploadedDocument instance with extracted data
            user: The user who uploaded the document (optional)
            additional_data: Additional data provided by the user (optional)
            
        Returns:
            Tuple containing:
                - Created/updated Borrower instance
                - Created Loan instance
        """
        from loans.models import Borrower, Loan
        from django.db import transaction
        
        additional_data = additional_data or {}
        
        # Extract borrower info
        full_name = document.extracted_name or additional_data.get('name', 'Unknown')
        name_parts = full_name.split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        # Get borrower email and phone from additional data or user
        email = additional_data.get('email')
        phone = additional_data.get('phone')
        
        # If user is provided and is a borrower, use their info
        if user and hasattr(user, 'role') and user.role == 'BORROWER':
            if not email:
                email = user.email
            if not phone and user.phone_number:
                phone = user.phone_number
        
        # Validate required information
        if not email:
            raise ValueError("Email is required to create a borrower")
        
        # Create or update borrower
        borrower, created = Borrower.objects.get_or_create(
            email=email,
            defaults={
                'first_name': first_name,
                'last_name': last_name,
                'phone_number': phone or '',
                # Default values for required fields
                'credit_score': additional_data.get('credit_score', 700),
                'annual_income': additional_data.get('annual_income', Decimal('75000.00')),
                'employment_status': additional_data.get('employment_status', 'EMPLOYED'),
                'property_type': additional_data.get('property_type', 'SINGLE_FAMILY'),
                'property_use': additional_data.get('property_use', 'PRIMARY_RESIDENCE')
            }
        )
        
        if not created:
            # Update existing borrower if we have new info
            if first_name and (borrower.first_name != first_name):
                borrower.first_name = first_name
            if last_name and (borrower.last_name != last_name):
                borrower.last_name = last_name
            if phone and (borrower.phone_number != phone):
                borrower.phone_number = phone
            borrower.save()
        
        # Extract loan details
        loan_amount = document.extracted_loan_amount
        apr = document.extracted_apr
        interest_rate = document.extracted_interest_rate
        loan_term_years = document.extracted_loan_term
        loan_type = document.extracted_loan_type or 'CONVENTIONAL'
        monthly_payment = document.extracted_monthly_payment
        
        # Override with additional data if provided
        if additional_data.get('loan_amount'):
            loan_amount = Decimal(additional_data.get('loan_amount'))
        if additional_data.get('apr'):
            apr = Decimal(additional_data.get('apr'))
        if additional_data.get('loan_term'):
            loan_term_years = int(additional_data.get('loan_term'))
        if additional_data.get('loan_type'):
            loan_type = additional_data.get('loan_type')
            
        # Validate required loan information
        if not loan_amount:
            raise ValueError("Loan amount is required to create a loan")
        if not apr:
            raise ValueError("APR is required to create a loan")
        if not loan_term_years:
            raise ValueError("Loan term is required to create a loan")
            
        # Create the loan
        loan = Loan.objects.create(
            borrower=borrower,
            loan_amount=loan_amount,
            original_apr=apr,
            loan_term=loan_term_years * 12,  # Convert years to months
            status='AVAILABLE',
            lead_type='COMPETITIVE',
            is_guaranteed=False,
            fico_score=borrower.credit_score,
            location=additional_data.get('location', 'US'),
            loan_type=loan_type,
            property_value=additional_data.get('property_value', loan_amount * Decimal('1.25')),
            down_payment=additional_data.get('down_payment', loan_amount * Decimal('0.20')),
            monthly_payment=monthly_payment or Decimal('0.00'),
            max_bids=10
        )
        
        # Link the loan document
        if document:
            loan.loan_estimate_document = document.file.url
            loan.save()
            
            # Mark document as processed
            document.processed = True
            document.save()
        
        # Log the creation
        logger.info(f"Created loan #{loan.id} for borrower {borrower.email} from document #{document.id}")
        
        return borrower, loan 