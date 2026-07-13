import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Tenant(models.Model):
    """
    Represents one dairy farm / organisation.
    All data rows carry a FK to this model for isolation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=100)
    owner_email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default="Pakistan")
    logo = models.ImageField(upload_to="tenant_logos/", null=True, blank=True)

    # Farm-level configuration
    gestation_days = models.PositiveSmallIntegerField(
        default=280,
        validators=[MinValueValidator(240), MaxValueValidator(320)],
        help_text="Default gestation period in days",
    )
    financial_year_start_month = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(12)],
    )
    milk_price_per_litre = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    currency = models.CharField(max_length=10, default="PKR")
    timezone = models.CharField(max_length=50, default="Asia/Karachi")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class SMTPConfig(models.Model):
    """Per-tenant outgoing email configuration."""
    tenant = models.OneToOneField(
        Tenant, on_delete=models.CASCADE, related_name="smtp_config"
    )
    host = models.CharField(max_length=255, default="smtp.gmail.com")
    port = models.PositiveSmallIntegerField(default=587)
    username = models.CharField(max_length=255)
    password = models.CharField(max_length=255)  # stored; encrypt at rest in prod
    use_tls = models.BooleanField(default=True)
    use_ssl = models.BooleanField(default=False)
    from_email = models.EmailField()
    from_name = models.CharField(max_length=100, default="Dusuq ERP")
    is_verified = models.BooleanField(default=False)
    last_tested_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "SMTP Configuration"

    def __str__(self):
        return f"SMTP for {self.tenant.name}"


class Shed(models.Model):
    """Physical shed or pen on the farm."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="sheds")
    name = models.CharField(max_length=100)
    capacity = models.PositiveSmallIntegerField(default=0)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [("tenant", "name")]
        ordering = ["name"]

    def __str__(self):
        return f"{self.tenant.name} — {self.name}"


class AnimalGroup(models.Model):
    """Logical grouping of animals (e.g. High Yielders, Dry Group)."""
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="animal_groups"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    class Meta:
        unique_together = [("tenant", "name")]
        ordering = ["name"]

    def __str__(self):
        return f"{self.tenant.name} — {self.name}"


class Breed(models.Model):
    """Animal breed master."""
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="breeds", null=True, blank=True
    )
    name = models.CharField(max_length=100)
    species = models.CharField(
        max_length=20,
        choices=[("cattle", "Cattle"), ("buffalo", "Buffalo"), ("goat", "Goat")],
        default="cattle",
    )
    is_global = models.BooleanField(
        default=False, help_text="Available to all tenants"
    )

    class Meta:
        ordering = ["species", "name"]

    def __str__(self):
        return f"{self.name} ({self.species})"
