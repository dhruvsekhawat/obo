from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoanViewSet
from bidding.views import BidViewSet

router = DefaultRouter()
router.register(r'loans', LoanViewSet, basename='loan')
router.register(r'bids', BidViewSet, basename='bid')

urlpatterns = [
    path('', include(router.urls)),
] 