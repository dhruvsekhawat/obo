from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, UserDetailView, CustomTokenObtainPairView, 
    GoogleAuthView, LoanOfficerPreferencesView, LoanOfficerProfileView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('user/', UserDetailView.as_view(), name='user_detail'),
    path('google/', GoogleAuthView.as_view(), name='google_auth'),
    path('loan_officer/preferences/', LoanOfficerPreferencesView.as_view(), name='loan_officer_preferences'),
    path('loan_officer/profile/', LoanOfficerProfileView.as_view(), name='loan_officer_profile'),
] 