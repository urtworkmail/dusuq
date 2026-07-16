from decimal import Decimal

from django.db import models
from django.utils import timezone


class BillingGateway(models.TextChoices):
    NONE = "none", "None (trial / not yet subscribed)"
    STRIPE = "stripe", "Stripe"
    PAYFAST = "payfast", "PayFast"
    MANUAL = "manual", "Manual / Invoiced"


class SubscriptionStatus(models.TextChoices):
    TRIALING = "trialing", "Trialing"
    ACTIVE = "active", "Active"
    PAST_DUE = "past_due", "Past Due"
    CANCELED = "canceled", "Canceled"
    EXPIRED = "expired", "Expired"


class Plan(models.Model):
    """
    A billable package. Deliberately DB-driven (not a hardcoded enum) so
    pricing and feature flags can be changed from the admin without a deploy.
    """
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    tagline = models.CharField(max_length=200, blank=True)
    price_monthly_pkr = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Leave blank for \"contact sales\" plans (e.g. Enterprise).",
    )

    has_ai_assistant = models.BooleanField(default=False, help_text="VetAssist access")
    has_priority_support = models.BooleanField(default=False, help_text="On-call + WhatsApp support")
    has_custom_agents = models.BooleanField(default=False, help_text="Enterprise: custom agents trained on their content")
    has_beta_access = models.BooleanField(default=False, help_text="Enterprise: early/beta feature access")

    # Filled in once the corresponding product/price exists on each gateway.
    stripe_price_id = models.CharField(max_length=100, blank=True)
    payfast_plan_id = models.CharField(max_length=100, blank=True)

    is_active = models.BooleanField(default=True, help_text="Whether new subscribers can pick this plan")
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name


class Subscription(models.Model):
    """One per tenant — trial state, current plan, and gateway linkage."""

    tenant = models.OneToOneField(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="subscription"
    )
    plan = models.ForeignKey(
        Plan, on_delete=models.PROTECT, related_name="subscriptions", null=True, blank=True
    )

    status = models.CharField(
        max_length=15, choices=SubscriptionStatus.choices, default=SubscriptionStatus.TRIALING
    )
    gateway = models.CharField(
        max_length=10, choices=BillingGateway.choices, default=BillingGateway.NONE
    )
    gateway_customer_id = models.CharField(max_length=150, blank=True)
    gateway_subscription_id = models.CharField(max_length=150, blank=True)

    trial_end = models.DateTimeField(null=True, blank=True)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    canceled_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_trialing(self):
        return (
            self.status == SubscriptionStatus.TRIALING
            and self.trial_end is not None
            and timezone.now() < self.trial_end
        )

    @property
    def trial_days_left(self):
        if not self.is_trialing:
            return 0
        return max((self.trial_end - timezone.now()).days, 0)

    @property
    def is_ai_enabled(self):
        """No AI during trial, regardless of eventual plan — by design."""
        if self.is_trialing:
            return False
        if self.status not in (SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE):
            return False
        return bool(self.plan and self.plan.has_ai_assistant)

    @property
    def is_access_active(self):
        """Whether the tenant should have any app access at all right now."""
        if self.status == SubscriptionStatus.TRIALING:
            return self.trial_end is not None and timezone.now() < self.trial_end
        return self.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE)

    def __str__(self):
        plan_name = self.plan.name if self.plan else "no plan"
        return f"{self.tenant.name} — {plan_name} ({self.status})"


class AIUsageRecord(models.Model):
    """
    One row per VetAssist call — the actual Gemini API cost for that call,
    plus our surcharge. This is the source of truth for AI billing, whether
    that ends up auto-metered (Stripe) or invoiced manually (PayFast).
    """

    class Kind(models.TextChoices):
        QUERY = "query", "Query"
        REPORT = "report", "Report"
        FORECAST = "forecast", "Forecast"

    tenant = models.ForeignKey(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="ai_usage_records"
    )
    user = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="ai_usage_records",
    )

    kind = models.CharField(max_length=10, choices=Kind.choices)
    model_name = models.CharField(max_length=50)
    input_tokens = models.PositiveIntegerField(default=0)
    output_tokens = models.PositiveIntegerField(default=0)

    api_cost_usd = models.DecimalField(
        max_digits=10, decimal_places=6, default=0,
        help_text="Actual Gemini API cost for this call",
    )
    surcharge_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("25.00"))
    billed_amount_usd = models.DecimalField(
        max_digits=10, decimal_places=6, default=0,
        help_text="api_cost_usd plus surcharge_percent — computed on save",
    )

    invoice = models.ForeignKey(
        "Invoice", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="ai_usage_records",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.billed_amount_usd:
            multiplier = Decimal("1") + (self.surcharge_percent / Decimal("100"))
            self.billed_amount_usd = (self.api_cost_usd * multiplier).quantize(Decimal("0.000001"))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.tenant.name} — {self.kind} — ${self.billed_amount_usd}"


class InvoiceStatus(models.TextChoices):
    OPEN = "open", "Open"
    PAID = "paid", "Paid"
    OVERDUE = "overdue", "Overdue"
    VOID = "void", "Void"


class Invoice(models.Model):
    """One billing-cycle invoice: base plan charge plus any AI usage overage."""

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="invoices")
    subscription = models.ForeignKey(
        Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices"
    )

    period_start = models.DateField()
    period_end = models.DateField()

    plan_amount_pkr = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    ai_usage_amount_usd = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    status = models.CharField(max_length=10, choices=InvoiceStatus.choices, default=InvoiceStatus.OPEN)
    gateway = models.CharField(max_length=10, choices=BillingGateway.choices, default=BillingGateway.MANUAL)
    gateway_invoice_id = models.CharField(max_length=150, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-period_start"]

    def __str__(self):
        return f"{self.tenant.name} — {self.period_start} to {self.period_end} ({self.status})"
