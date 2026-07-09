from django.db import models
from django.core.validators import MinValueValidator


class ProductCategory(models.TextChoices):
    FEED = "feed", "Feed"
    MEDICINE = "medicine", "Medicine"
    SEMEN = "semen", "Semen"
    GENERAL = "general", "General"


class Product(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="products")
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=15, choices=ProductCategory.choices, default=ProductCategory.GENERAL)
    unit = models.CharField(max_length=30, default="kg")
    reorder_level = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("tenant", "name")]
        ordering = ["category", "name"]

    def __str__(self):
        return f"{self.name} ({self.category})"

    @property
    def current_stock(self):
        from django.db.models import Sum
        stock_in = self.stock_ins.aggregate(t=Sum("quantity"))["t"] or 0
        consumed = self.consumptions.aggregate(t=Sum("quantity"))["t"] or 0
        return float(stock_in) - float(consumed)


class StockIn(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="stock_ins")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="stock_ins")
    date = models.DateField()
    quantity = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    supplier = models.CharField(max_length=200, blank=True)
    invoice_number = models.CharField(max_length=100, blank=True)
    batch_number = models.CharField(max_length=100, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def save(self, *args, **kwargs):
        self.total_cost = self.quantity * self.cost_per_unit
        super().save(*args, **kwargs)


class Consumption(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="consumptions")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="consumptions")
    date = models.DateField()
    quantity = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    shed = models.ForeignKey(
        "tenants.Shed", on_delete=models.SET_NULL, null=True, blank=True
    )
    animal = models.ForeignKey(
        "animals.Animal", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="consumptions",
    )
    # Link to health event if medicine
    treatment = models.ForeignKey(
        "health.Treatment", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="consumptions",
    )
    # Link to insemination if semen
    insemination = models.ForeignKey(
        "reproduction.Insemination", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="consumptions",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
