from django.db import models
from django.core.validators import MinValueValidator


class MilkSession(models.TextChoices):
    AM = "am", "Morning (AM)"
    PM = "pm", "Evening (PM)"


class MilkRecord(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="milk_records")
    animal = models.ForeignKey("animals.Animal", on_delete=models.CASCADE, related_name="milk_records")
    date = models.DateField()
    session = models.CharField(max_length=5, choices=MilkSession.choices)
    litres = models.DecimalField(max_digits=7, decimal_places=2, validators=[MinValueValidator(0)])
    fat_percent = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    snf_percent = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="milk_records_entered"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("tenant", "animal", "date", "session")]
        ordering = ["-date", "animal__tag_number"]

    def __str__(self):
        return f"{self.animal.tag_number} | {self.date} {self.session} | {self.litres}L"


class ConsumptionHead(models.Model):
    """User-defined consumption categories e.g. Mess, Calf, Employee."""
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="consumption_heads")
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [("tenant", "name")]

    def __str__(self):
        return f"{self.tenant.name} — {self.name}"


class MilkConsumption(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="milk_consumptions")
    head = models.ForeignKey(ConsumptionHead, on_delete=models.CASCADE, related_name="consumptions")
    date = models.DateField()
    litres = models.DecimalField(max_digits=7, decimal_places=2, validators=[MinValueValidator(0)])
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]


class MilkDispatch(models.Model):
    DISPATCH_TYPE = [("corporate", "Corporate"), ("local", "Local / Retail")]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="milk_dispatches")
    dispatch_type = models.CharField(max_length=15, choices=DISPATCH_TYPE, default="corporate")
    date = models.DateField()
    buyer_name = models.CharField(max_length=200)
    gross_litres = models.DecimalField(max_digits=9, decimal_places=2, validators=[MinValueValidator(0)])

    # Quality — corporate dispatch
    lr_reading = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Lactometer Reading")
    fat_percent = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    snf_percent = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    adjusted_litres = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)

    price_per_litre = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_received = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    @property
    def outstanding(self):
        return self.total_amount - self.amount_received
