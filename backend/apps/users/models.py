import hashlib
import secrets
import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class Role(models.TextChoices):
    OWNER = "owner", "Owner / Admin"
    MANAGER = "manager", "Farm Manager"
    VETERINARY = "veterinary", "Veterinary Doctor"
    ACCOUNTANT = "accountant", "Accountant"
    TECHNICIAN = "technician", "Breeding Technician"
    MILKER = "milker", "Milker"


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_email_verified", True)
        extra_fields.setdefault("role", Role.OWNER)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True,
    )
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=30, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MILKER)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(
        default=False,
        help_text="Must verify via emailed link before the account gates lift — see VerificationToken.",
    )

    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)
    last_activity = models.DateTimeField(
        null=True, blank=True,
        help_text="Updated (throttled, at most once/minute) by UpdateLastActivityMiddleware on any "
                   "authenticated request — used to compute 'currently online' for the platform admin dashboard.",
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        ordering = ["first_name", "last_name"]

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_owner(self):
        return self.role == Role.OWNER

    @property
    def is_manager(self):
        return self.role in (Role.OWNER, Role.MANAGER)


class VerificationPurpose(models.TextChoices):
    EMAIL_VERIFY = "email_verify", "Email Verification"
    PASSWORD_RESET = "password_reset", "Password Reset"
    NEW_DEVICE = "new_device", "New Device Login"


def _default_expiry():
    return timezone.now() + timezone.timedelta(hours=24)


class VerificationToken(models.Model):
    """
    A single-use, time-limited secret handed to a user out-of-band (email).
    The secret itself (`token` for link-based flows, `code` for the 6-digit
    new-device flow) is never stored in plaintext — only its SHA-256 hash —
    so a database leak alone can't be used to complete any of these flows.
    """
    user = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, related_name="verification_tokens"
    )
    purpose = models.CharField(max_length=20, choices=VerificationPurpose.choices)
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    # Extra context the flow needs at confirmation time — e.g. the new-device
    # flow stores the device_id/user_agent/ip to create the TrustedDevice row
    # once the code is confirmed, without trusting anything the client resends.
    meta = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=_default_expiry)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["user", "purpose"])]

    @property
    def is_valid(self):
        return self.used_at is None and timezone.now() < self.expires_at

    def mark_used(self):
        self.used_at = timezone.now()
        self.save(update_fields=["used_at"])

    @staticmethod
    def hash_secret(raw):
        return hashlib.sha256(raw.encode()).hexdigest()

    @classmethod
    def issue(cls, user, purpose, ttl_hours=24, meta=None, code_only=False):
        """
        Creates the DB row and returns (token_instance, raw_secret) — the raw
        secret is returned exactly once and must be emailed immediately; it
        cannot be recovered later since only its hash is persisted.

        code_only=True generates a 6-digit numeric code (new-device flow,
        typed by hand); otherwise a long URL-safe token (emailed as a link).
        """
        raw = f"{secrets.randbelow(900000) + 100000}" if code_only else secrets.token_urlsafe(32)
        instance = cls.objects.create(
            user=user,
            purpose=purpose,
            token_hash=cls.hash_secret(raw),
            expires_at=timezone.now() + timezone.timedelta(hours=ttl_hours),
            meta=meta or {},
        )
        return instance, raw

    @classmethod
    def consume(cls, raw_secret, purpose):
        """Looks up a still-valid token by its raw secret and marks it used. Returns None if invalid/expired/already-used."""
        if not raw_secret:
            return None
        try:
            token = cls.objects.select_related("user").get(
                token_hash=cls.hash_secret(raw_secret), purpose=purpose
            )
        except cls.DoesNotExist:
            return None
        if not token.is_valid:
            return None
        token.mark_used()
        return token


class TrustedDevice(models.Model):
    """
    A browser/device that has completed the new-device email-code challenge
    at least once. `device_id` is a random identifier the frontend generates
    once and persists in localStorage — it identifies a *browser*, not a
    physical device, which is the same tradeoff every "new device" email
    alert (banks, Google, etc.) makes when it has no OS-level fingerprint to
    rely on.
    """
    user = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, related_name="trusted_devices"
    )
    device_id = models.CharField(max_length=64, db_index=True)
    user_agent = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    trusted_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("user", "device_id")]

    def __str__(self):
        return f"{self.user.email} — {self.device_id[:8]}…"
