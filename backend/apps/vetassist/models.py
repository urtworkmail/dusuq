from django.db import models


class EntityType(models.TextChoices):
    ANIMAL = "animal", "Animal"
    SHED = "shed", "Shed"
    GROUP = "group", "Animal Group"
    FARM = "farm", "Farm"


class ForecastMetric(models.TextChoices):
    MILK_YIELD = "milk_yield", "Milk Yield"
    MILK_REVENUE = "milk_revenue", "Milk Revenue"
    FEED_COST = "feed_cost", "Feed Cost"
    CASH_POSITION = "cash_position", "Cash Position"


class VetAssistQuery(models.Model):
    """A single natural-language question asked of VetAssist and its answer."""

    tenant = models.ForeignKey(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="vetassist_queries"
    )
    asked_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, related_name="vetassist_queries"
    )
    question = models.TextField()
    answer = models.TextField(blank=True)
    sources = models.JSONField(default=list, blank=True, help_text="Modules consulted to build the answer")
    used_external_research = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.question[:60]}"


class VetAssistReport(models.Model):
    """A generated per-animal or per-herd report."""

    tenant = models.ForeignKey(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="vetassist_reports"
    )
    requested_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, related_name="vetassist_reports"
    )
    entity_type = models.CharField(max_length=10, choices=EntityType.choices)
    entity_id = models.CharField(
        max_length=100, help_text="Animal tag number, shed ID, group ID, or blank for farm-wide"
    )
    include_research = models.BooleanField(default=False)
    content = models.TextField(blank=True)
    used_external_research = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.entity_type}:{self.entity_id} @ {self.created_at:%Y-%m-%d}"


class VetAssistForecast(models.Model):
    """A generated forecast or historical analysis for a metric/scope."""

    tenant = models.ForeignKey(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="vetassist_forecasts"
    )
    requested_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, related_name="vetassist_forecasts"
    )
    metric = models.CharField(max_length=20, choices=ForecastMetric.choices)
    scope = models.CharField(max_length=10, choices=EntityType.choices, default=EntityType.FARM)
    scope_id = models.CharField(max_length=100, blank=True)
    horizon_days = models.PositiveSmallIntegerField(default=30)
    content = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.metric} forecast @ {self.created_at:%Y-%m-%d}"
