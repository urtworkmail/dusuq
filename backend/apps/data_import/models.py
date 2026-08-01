from django.db import models


class ImportDataType(models.TextChoices):
    ANIMALS = "animals", "Animals"


class ImportStatus(models.TextChoices):
    PREVIEWED = "previewed", "Previewed (not yet committed)"
    COMMITTED = "committed", "Committed"


class ImportJob(models.Model):
    """
    Audit trail for every "bring your existing data in" import — one row per
    upload. Preview runs aren't persisted (they don't touch real data, no
    need to track them); only committed imports are logged here, so a farm
    can see what was actually brought in and when.
    """
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="import_jobs")
    user = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="import_jobs"
    )
    data_type = models.CharField(max_length=20, choices=ImportDataType.choices)
    file_name = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=15, choices=ImportStatus.choices, default=ImportStatus.COMMITTED)
    total_rows = models.PositiveIntegerField(default=0)
    success_count = models.PositiveIntegerField(default=0)
    error_count = models.PositiveIntegerField(default=0)
    error_log = models.JSONField(default=list, blank=True, help_text="List of {row, message} for rows that failed")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.tenant.name} — {self.data_type} import ({self.success_count}/{self.total_rows}) @ {self.created_at:%Y-%m-%d}"
