from rest_framework import serializers
from .models import Bid

class BidSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bid
        fields = ['id', 'loan', 'loan_officer', 'bid_apr', 'created_at', 'updated_at']
        read_only_fields = ['loan_officer', 'created_at', 'updated_at'] 