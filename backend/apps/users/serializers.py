import secrets

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from datetime import timedelta
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.tenants.models import Tenant
from apps.subscriptions.models import Subscription, SubscriptionStatus
from apps.platform_admin.audit import log_signup, log_login
from .emails import send_verification_email, send_new_device_code, _client_ip
from .exceptions import NewDeviceVerificationRequired
from .models import Role, TrustedDevice, VerificationPurpose, VerificationToken

User = get_user_model()


def _user_payload(user):
    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "tenant_id": str(user.tenant_id) if user.tenant_id else None,
        "tenant_name": user.tenant.name if user.tenant else None,
        "is_superuser": user.is_superuser,
        "is_email_verified": user.is_email_verified,
    }


def _subscription_payload(user):
    subscription = getattr(user.tenant, "subscription", None) if user.tenant else None
    if not subscription:
        return None
    return {
        "status": subscription.status,
        "plan": subscription.plan.slug if subscription.plan else None,
        "is_trialing": subscription.is_trialing,
        "trial_days_left": subscription.trial_days_left,
        "is_ai_enabled": subscription.is_ai_enabled,
        "is_access_active": subscription.is_access_active,
    }


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    JWT login — embeds user info in response. Also gates on device
    recognition: correct credentials from a browser with no matching
    TrustedDevice row don't get tokens yet, they get a 6-digit emailed code
    challenge instead (see NewDeviceVerificationRequired / VerifyDeviceView).
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        request = self.context.get("request")

        device_id = (request.data.get("device_id") or "").strip() if request else ""
        device = TrustedDevice.objects.filter(user=user, device_id=device_id).first() if device_id else None

        if device is None:
            token = send_new_device_code(user, request)
            raise NewDeviceVerificationRequired(token.id)

        device.save(update_fields=["last_seen_at"])  # auto_now bumps it

        log_login(user, request)
        data["user"] = _user_payload(user)
        data["subscription"] = _subscription_payload(user)
        return data


class RegisterSerializer(serializers.Serializer):
    """
    Creates both a Tenant and an Owner user in one request.
    Used on the public sign-up page.
    """
    # Farm info
    farm_name = serializers.CharField(max_length=200)
    farm_slug = serializers.SlugField(max_length=100)

    # Owner info
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    # The browser used to sign up is trusted immediately — there's no prior
    # session to have proven itself, so a device check adds nothing here;
    # it only starts to matter from the next login onward.
    device_id = serializers.CharField(max_length=64, required=False, allow_blank=True, write_only=True)

    def validate_farm_slug(self, value):
        if Tenant.objects.filter(slug=value).exists():
            raise serializers.ValidationError("This farm slug is already taken.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        tenant = Tenant.objects.create(
            name=validated_data["farm_name"],
            slug=validated_data["farm_slug"],
            owner_email=validated_data["email"],
        )
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            phone=validated_data.get("phone", ""),
            role=Role.OWNER,
            tenant=tenant,
        )
        # 15-day free trial, no plan yet, no AI (Subscription.is_ai_enabled is
        # False for any trialing subscription regardless of plan).
        Subscription.objects.create(
            tenant=tenant,
            status=SubscriptionStatus.TRIALING,
            trial_end=timezone.now() + timedelta(days=settings.TRIAL_PERIOD_DAYS),
        )
        device_id = (validated_data.get("device_id") or "").strip()
        if device_id:
            request = self.context.get("request")
            TrustedDevice.objects.create(
                user=user,
                device_id=device_id,
                user_agent=request.META.get("HTTP_USER_AGENT", "")[:255] if request else "",
                ip_address=_client_ip(request) if request else None,
            )
        log_signup(user, tenant, self.context.get("request"))
        send_verification_email(user)
        return user, tenant


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "full_name",
            "phone", "role", "avatar", "is_active", "is_superuser",
            "is_email_verified", "date_joined", "last_login",
        ]
        read_only_fields = ["id", "date_joined", "last_login"]


class UserCreateSerializer(serializers.ModelSerializer):
    """Admin/Owner creates a new user in their farm."""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "phone", "role", "password"]

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already in use.")
        return value

    def create(self, validated_data):
        request = self.context["request"]
        user = User.objects.create_user(
            tenant=request.tenant,
            **validated_data,
        )
        send_verification_email(user)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["first_name", "last_name", "phone", "role", "is_active", "avatar"]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["old_password"]):
            raise serializers.ValidationError({"old_password": "Incorrect password."})
        return attrs

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class ResetPasswordSerializer(serializers.Serializer):
    """Owner resets another user's password."""
    user_id = serializers.UUIDField()
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        return value


class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.CharField(write_only=True)

    def validate_token(self, value):
        verification = VerificationToken.consume(value, VerificationPurpose.EMAIL_VERIFY)
        if verification is None:
            raise serializers.ValidationError("This verification link is invalid or has expired.")
        self._verification = verification
        return value

    def save(self):
        user = self._verification.user
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])
        return user


class ForgotPasswordSerializer(serializers.Serializer):
    """Self-service — deliberately never reveals whether the email matched anything."""
    email = serializers.EmailField()

    def save(self):
        from .emails import send_password_reset_email
        try:
            user = User.objects.get(email=self.validated_data["email"], is_active=True)
        except User.DoesNotExist:
            return
        send_password_reset_email(user)


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate_token(self, value):
        verification = VerificationToken.consume(value, VerificationPurpose.PASSWORD_RESET)
        if verification is None:
            raise serializers.ValidationError("This reset link is invalid or has expired.")
        self._verification = verification
        return value

    def save(self):
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

        user = self._verification.user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])

        # A reset is a strong signal something was wrong — force re-login
        # everywhere rather than leaving old sessions valid.
        for outstanding in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=outstanding)
        return user


class DeviceVerifySerializer(serializers.Serializer):
    challenge_id = serializers.IntegerField()
    code = serializers.CharField(write_only=True)

    def validate(self, attrs):
        try:
            token = VerificationToken.objects.select_related("user").get(
                id=attrs["challenge_id"], purpose=VerificationPurpose.NEW_DEVICE
            )
        except VerificationToken.DoesNotExist:
            raise serializers.ValidationError({"code": "This code is invalid or has expired."})

        if not token.is_valid or token.token_hash != VerificationToken.hash_secret(attrs["code"]):
            raise serializers.ValidationError({"code": "This code is invalid or has expired."})

        token.mark_used()
        self._token = token
        return attrs

    def save(self):
        token = self._token
        user = token.user
        device_id = (token.meta.get("device_id") or "").strip() or secrets.token_urlsafe(24)
        device, _ = TrustedDevice.objects.update_or_create(
            user=user,
            device_id=device_id,
            defaults={
                "user_agent": token.meta.get("user_agent", ""),
                "ip_address": token.meta.get("ip") or None,
            },
        )
        log_login(user)
        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "device_id": device_id,
            "user": _user_payload(user),
            "subscription": _subscription_payload(user),
        }
