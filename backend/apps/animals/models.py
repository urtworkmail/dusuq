from django.db import models
from django.core.validators import MinValueValidator


class AnimalStatus(models.TextChoices):
    HEIFER = "heifer", "Heifer"
    OPEN = "open", "Open (Milking)"
    INSEMINATED = "inseminated", "Inseminated"
    PREGNANT = "pregnant", "Pregnant"
    DRY = "dry", "Dry"
    SICK = "sick", "Sick"
    SOLD = "sold", "Sold"
    DEAD = "dead", "Dead"
    CULLED = "culled", "Culled"


class Sex(models.TextChoices):
    FEMALE = "female", "Female"
    MALE = "male", "Male"


class Animal(models.Model):
    tenant = models.ForeignKey(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="animals"
    )
    tag_number = models.CharField(max_length=50)
    name = models.CharField(max_length=100, blank=True)
    breed = models.ForeignKey(
        "tenants.Breed", on_delete=models.SET_NULL, null=True, blank=True
    )
    sex = models.CharField(max_length=10, choices=Sex.choices, default=Sex.FEMALE)
    date_of_birth = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=AnimalStatus.choices, default=AnimalStatus.HEIFER
    )
    shed = models.ForeignKey(
        "tenants.Shed",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="animals",
    )
    group = models.ForeignKey(
        "tenants.AnimalGroup",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="animals",
    )
    dam = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="calves",
        verbose_name="Dam (Mother)",
    )
    sire_tag = models.CharField(
        max_length=50, blank=True, verbose_name="Sire Tag / Bull ID"
    )
    lactation_number = models.PositiveSmallIntegerField(default=0)
    purchase_date = models.DateField(null=True, blank=True)
    purchase_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    weight_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("tenant", "tag_number")]
        ordering = ["tag_number"]

    def __str__(self):
        return f"{self.tag_number} — {self.name or 'Unnamed'} ({self.tenant.name})"

    @property
    def display_name(self):
        return self.name if self.name else self.tag_number

    @property
    def is_milking(self):
        return self.status in (
            AnimalStatus.OPEN,
            AnimalStatus.INSEMINATED,
            AnimalStatus.PREGNANT,
        )
