from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Bid
from .serializers import BidSerializer

class BidViewSet(viewsets.ModelViewSet):
    serializer_class = BidSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Bid.objects.filter(loan_officer=self.request.user.loan_officer_profile)

    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get bid history for the current user"""
        bids = self.get_queryset().order_by('-created_at')
        
        return Response([{
            'id': bid.id,
            'loan_id': bid.loan.id,
            'bid_apr': bid.bid_apr,
            'created_at': bid.created_at
        } for bid in bids])
