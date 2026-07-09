from django.db import models
from django.utils import timezone


class InseminationType(models.TextChoices):
    AI = "ai", "Artificial Insemination"
    BULL = "bull", "Natural Service (Bull)"


class PregnancyTestMethod(models.TextChoices):
    RECTAL = "rectal", "Rectal Palpation"
    ULTRASOUND = "ultrasound", "Ultrasound"
    BLOOD = "blood", "Blood Test"
    MILK = "milk", "Milk Progesterone"


class PregnancyResult(models.TextChoices):
    POSITIVE = "positive", "Positive"
    NEGATIVE = "negative", "Negative"
    REPEAT = "repeat", "Repeat (Recheck)"


class CalvingType(models.TextChoices):
    NORMAL = "normal", "Normal"
    ASSISTED = "assisted", "Assisted"
    CAESAREAN = "caesarean", "Caesarean"


class Insemination(models.Model):
    tenant = models.ForeignKey(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="inseminations"
    )
    animal = models.ForeignKey(
        "animals.Animal", on_delete=models.CASCADE, related_name="inseminations"
    )
    insemination_type = models.CharField(
        max_length=10, choices=InseminationType.choices, default=InseminationType.AI
    )
    date = models.DateField()

    # AI-specific
    semen_batch = models.CharField(max_length=100, blank=True)
    bull_breed = models.CharField(max_length=100, blank=True)
    technician = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inseminations_done",
    )

    # Bull service
    bull_tag = models.CharField(max_length=50, blank=True)

    repeat_number = models.PositiveSmallIntegerField(
        default=1, help_text="1=first service, 2=second repeat, etc."
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.animal.tag_number} — {self.insemination_type} on {self.date}"

    @property
    def expected_calving_date(self):
        from datetime import timedelta
        gestation = self.tenant.gestation_days
        return self.date + timedelta(days=gestation)


class PregnancyTest(models.Model):
    tenant = models.ForeignKey(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="pregnancy_tests"
    )
    animal = models.ForeignKey(
        "animals.Animal", on_delete=models.CASCADE, related_name="pregnancy_tests"
    )
    insemination = models.ForeignKey(
        Insemination,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tests",
    )
    date = models.DateField()
    method = models.CharField(
        max_length=20, choices=PregnancyTestMethod.choices, default=PregnancyTestMethod.RECTAL
    )
    result = models.CharField(
        max_length=10, choices=PregnancyResult.choices
    )
    conducted_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="preg_tests_done",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.animal.tag_number} — {self.result} on {self.date}"


class DryOff(models.Model):
    tenant = models.ForeignKey(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="dry_offs"
    )
    animal = models.ForeignKey(
        "animals.Animal", on_delete=models.CASCADE, related_name="dry_offs"
    )
    dry_off_date = models.DateField()
    expected_calving_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-dry_off_date"]


class Calving(models.Model):
    tenant = models.ForeignKey(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="calvings"
    )
    dam = models.ForeignKey(
        "animals.Animal", on_delete=models.CASCADE, related_name="calvings"
    )
    insemination = models.ForeignKey(
        Insemination,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="calving",
    )
    calving_date = models.DateField()
    calving_type = models.CharField(
        max_length=15, choices=CalvingType.choices, default=CalvingType.NORMAL
    )
    dam_condition = models.CharField(
        max_length=20,
        choices=[("good", "Good"), ("fair", "Fair"), ("poor", "Poor")],
        default="good",
    )
    # Calf details
    calf_tag = models.CharField(max_length=50, blank=True)
    calf_sex = models.CharField(
        max_length=10,
        choices=[("male", "Male"), ("female", "Female"), ("stillborn", "Stillborn")],
        default="female",
    )
    calf_weight_kg = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-calving_date"]

    def __str__(self):
        return f"{self.dam.tag_number} calved on {self.calving_date}"


class Abortion(models.Model):
    tenant = models.ForeignKey(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="abortions"
    )
    animal = models.ForeignKey(
        "animals.Animal", on_delete=models.CASCADE, related_name="abortions"
    )
    insemination = models.ForeignKey(
        Insemination,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="abortions",
    )
    date = models.DateField()
    gestation_stage_days = models.PositiveSmallIntegerField(null=True, blank=True)
    cause = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
