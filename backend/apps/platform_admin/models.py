from django.db import models


class AuditAction(models.TextChoices):
    SIGNUP = "signup", "User Signed Up"
    FARM_CREATED = "farm_created", "Farm Created"
    SUBSCRIPTION_PURCHASED = "subscription_purchased", "Subscription Purchased"
    SUBSCRIPTION_RENEWED = "subscription_renewed", "Subscription Renewed"
    LOGIN = "login", "User Logged In"
    LOGOUT = "logout", "User Logged Out"
    DATA_CHANGED = "data_changed", "Data Changed"


class AuditLog(models.Model):
    """
    Platform-wide audit trail for the SaaS owner dashboard. Deliberately
    covers the specific events requested (signup, farm creation, subscription
    purchase/renewal, login/logout) plus data-change logging on the
    highest-value models first (Animal, Transaction, User) rather than every
    model in the system — see apps/platform_admin/signals.py for exactly
    which models are wired up; extend that list as needed.
    """
    tenant = models.ForeignKey(
        "tenants.Tenant", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs"
    )
    user = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs"
    )
    action = models.CharField(max_length=30, choices=AuditAction.choices)
    target_model = models.CharField(max_length=100, blank=True)
    target_id = models.CharField(max_length=100, blank=True)
    description = models.CharField(max_length=500, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["action", "-created_at"]),
        ]

    def __str__(self):
        who = self.user.email if self.user else "system"
        return f"{self.get_action_display()} — {who} @ {self.created_at:%Y-%m-%d %H:%M}"
