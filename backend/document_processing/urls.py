from django.urls import path
from .views import DocumentUploadView, LoanCreateView

urlpatterns = [
    path('upload/', DocumentUploadView.as_view(), name='document-upload'),
    path('loans/create/', LoanCreateView.as_view(), name='loan-create'),
] 