from django.shortcuts import render
from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db import transaction
from decimal import Decimal
import os

from .models import UploadedDocument
from .serializers import (
    UploadedDocumentSerializer, 
    DocumentExtractResponseSerializer,
    LoanCreationSerializer
)
from .services import DocumentProcessor, LoanCreationService, GEMINI_AVAILABLE, GOOGLE_API_KEY
from loans.models import Borrower, Loan
import logging

logger = logging.getLogger(__name__)

class DocumentUploadView(views.APIView):
    """API view for uploading and processing loan documents.
    
    This view handles document upload and data extraction without requiring
    authentication, allowing borrowers to use the system without creating
    an account. The extracted data is sent back to the frontend for user
    verification and additional input.
    """
    permission_classes = [AllowAny]  # Allow public access for borrowers
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        """Handle document upload and processing.
        
        Args:
            request: The HTTP request.
            
        Returns:
            Response with extracted data or error message.
        """
        # Validate file upload
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file uploaded'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        
        # Validate file type (only accept PDFs)
        if not file.name.lower().endswith('.pdf'):
            return Response(
                {'error': 'Only PDF files are supported'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create document instance (without user association)
            document = UploadedDocument(
                file=file,
                original_filename=file.name
            )
            
            # If the request is authenticated, link the document to the user
            if request.user and request.user.is_authenticated:
                document.uploaded_by = request.user
                
            document.save()
            
            # Process the document - extract data only, don't create a loan
            extracted_data = DocumentProcessor.process_document(document)
            
            # Create response data
            response_data = {
                'document_id': document.id,
                'filename': document.original_filename,
                'extracted_data': {
                    'name': extracted_data.get('name'),
                    'apr': extracted_data.get('apr'),
                    'interest_rate': extracted_data.get('interest_rate'),
                    'loan_amount': extracted_data.get('loan_amount'),
                    'loan_term': extracted_data.get('loan_term'),
                    'loan_type': extracted_data.get('loan_type'),
                    'monthly_payment': extracted_data.get('monthly_payment'),
                    'confidence': extracted_data.get('confidence')
                }
            }
            
            # Serialize and return response
            serializer = DocumentExtractResponseSerializer(data=response_data)
            if serializer.is_valid():
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error processing document upload: {str(e)}")
            return Response(
                {'error': f'Error processing document: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LoanCreateView(views.APIView):
    """View for creating loans from borrower form submissions.
    
    This view is called after the borrower has reviewed the extracted data,
    filled in any missing information, and accepted terms & conditions.
    No authentication is required, as borrowers don't need accounts.
    """
    permission_classes = [AllowAny]  # Allow public access for borrowers
    
    @transaction.atomic
    def post(self, request, *args, **kwargs):
        """Create a new loan from borrower submission"""
        try:
            # Validate the incoming data
            serializer = LoanCreationSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            validated_data = serializer.validated_data
            
            # Extract form data from validated data
            name = validated_data.get('name')
            email = validated_data.get('email')
            phone = validated_data.get('phone')
            apr = validated_data.get('apr')
            loan_amount = validated_data.get('loan_amount')
            loan_term = validated_data.get('loan_term')
            loan_type = validated_data.get('loan_type')
            document_id = validated_data.get('document_id')
            
            # Extract notification preferences
            notify_by_email = validated_data.get('notify_by_email', True)
            notify_by_sms = validated_data.get('notify_by_sms', True)
            
            # Ensure we have valid contact information for notifications
            if not email and not phone:
                return Response(
                    {'error': 'Either email or phone number is required for notifications'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Parse name into first and last name
            name_parts = name.split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ''
            
            # Create or update borrower
            borrower, created = Borrower.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'phone_number': phone,
                    'credit_score': validated_data.get('credit_score'),
                    'annual_income': validated_data.get('annual_income'),
                    'employment_status': validated_data.get('employment_status', 'EMPLOYED'),
                    'property_type': validated_data.get('property_type'),
                    'property_use': validated_data.get('property_use'),
                    'notify_by_email': notify_by_email,
                    'notify_by_sms': notify_by_sms
                }
            )
            
            if not created:
                # Update existing borrower info
                borrower.first_name = first_name
                borrower.last_name = last_name
                borrower.phone_number = phone
                if validated_data.get('credit_score'):
                    borrower.credit_score = validated_data.get('credit_score')
                if validated_data.get('annual_income'):
                    borrower.annual_income = validated_data.get('annual_income')
                # Update notification preferences
                borrower.notify_by_email = notify_by_email
                borrower.notify_by_sms = notify_by_sms
                borrower.save()
            
            # Create loan
            loan = Loan.objects.create(
                borrower=borrower,
                loan_amount=loan_amount,
                original_apr=apr,
                loan_term=loan_term * 12,  # Convert years to months
                status='AVAILABLE',
                lead_type='COMPETITIVE',
                is_guaranteed=False,
                fico_score=borrower.credit_score,
                location=validated_data.get('location'),
                loan_type=loan_type,
                property_value=validated_data.get('property_value'),
                down_payment=validated_data.get('down_payment'),
                monthly_payment=validated_data.get('monthly_payment', Decimal('0.00')),
                max_bids=10
            )
            
            # If a document was previously uploaded, link it to the loan
            if document_id:
                try:
                    document = UploadedDocument.objects.get(id=document_id)
                    loan.loan_estimate_document = document.file.url
                    loan.save()
                    
                    # Update the document to link it with the created loan
                    document.created_loan = loan
                    document.processed = True
                    document.save()
                except UploadedDocument.DoesNotExist:
                    logger.warning(f"Document with ID {document_id} not found when creating loan")
            
            # Return success response with a thank you message for the borrower
            return Response({
                'message': 'Thank you! Your loan application has been submitted successfully. We will notify you if we can beat your current rate.',
                'loan_id': loan.id
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating loan: {str(e)}")
            return Response(
                {'error': f'Failed to create loan: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
