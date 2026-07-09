from django.db import models


class NotificationType(models.TextChoices):
    CALVING_DUE = "calving_due", "Calving Due"
    PREG_CHECK_DUE = "preg_check_due", "Pregnancy Check Due"
    VACCINATION_DUE = "vaccination_due", "Vaccination Due"
    DEWORMING_DUE = "deworming_due", "Deworming Due"
    TREATMENT_FOLLOWUP = "treatment_followup", "Treatment Follow-up Due"
    LOW_STOCK = "low_stock", "Low Stock Alert"
    MILK_DROP = "milk_drop", "Milk Production Drop"
    SYSTEM = "system", "System Message"


class Notification(models.Model):
    tenant = models.ForeignKey(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="notifications"
    )
    user = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, related_name="notifications"
    )
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    # Optional link to the relevant object
    link = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.notification_type} → {self.user.email}"
