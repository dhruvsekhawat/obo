from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import LoanOfficerProfile, LoanOfficerPreferences

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'first_name', 'last_name', 'role')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class LoanOfficerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanOfficerProfile
        fields = (
            'id', 'nmls_id', 'company_name', 'years_of_experience',
            'license_expiry', 'phone_number', 'is_active', 'profile_completed',
            'subscription_plan'
        )

class LoanOfficerProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanOfficerProfile
        fields = (
            'nmls_id', 'company_name', 'years_of_experience',
            'license_expiry', 'phone_number'
        )

    def validate_nmls_id(self, value):
        """Validate NMLS ID"""
        if not value:
            raise serializers.ValidationError("NMLS ID is required")
        if value.startswith(('G', 'R')):
            raise serializers.ValidationError(
                "Please provide a valid NMLS ID, not a temporary one"
            )
        # Check if NMLS ID is already in use by another loan officer
        if LoanOfficerProfile.objects.exclude(pk=self.instance.pk).filter(nmls_id=value).exists():
            raise serializers.ValidationError("This NMLS ID is already in use")
        return value

    def validate_phone_number(self, value):
        """Validate phone number"""
        if not value:
            raise serializers.ValidationError("Phone number is required")
        # Add any phone number format validation if needed
        return value

    def validate_years_of_experience(self, value):
        """Validate years of experience"""
        if value is None:
            raise serializers.ValidationError("Years of experience is required")
        if value < 0:
            raise serializers.ValidationError("Years of experience cannot be negative")
        return value

    def validate_company_name(self, value):
        """Validate company name"""
        if not value:
            raise serializers.ValidationError("Company name is required")
        return value

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        instance.check_profile_completion()
        return instance

class LoanOfficerPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanOfficerPreferences
        exclude = ('loan_officer',)

class UserDetailSerializer(serializers.ModelSerializer):
    loan_officer_profile = LoanOfficerProfileSerializer(read_only=True)
    preferences = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'email', 'first_name', 'last_name',
            'role', 'is_verified', 'loan_officer_profile',
            'preferences'
        )

    def get_preferences(self, obj):
        if hasattr(obj, 'loan_officer_profile'):
            try:
                preferences = LoanOfficerPreferences.objects.get(loan_officer=obj.loan_officer_profile)
                return LoanOfficerPreferencesSerializer(preferences).data
            except LoanOfficerPreferences.DoesNotExist:
                return None
        return None