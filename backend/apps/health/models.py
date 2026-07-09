from django.db import models


class Treatment(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="treatments")
    animal = models.ForeignKey("animals.Animal", on_delete=models.CASCADE, related_name="treatments")
    date = models.DateField()
    diagnosis = models.CharField(max_length=300)
    drug = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100, blank=True)
    route = models.CharField(
        max_length=20,
        choices=[("oral","Oral"),("injection","Injection"),("topical","Topical"),("iv","IV")],
        default="injection",
    )
    withdrawal_days = models.PositiveSmallIntegerField(default=0)
    administered_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="treatments_given"
    )
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    follow_up_date = models.DateField(null=True, blank=True)
    outcome = models.CharField(
        max_length=20,
        choices=[("ongoing","Ongoing"),("recovered","Recovered"),("chronic","Chronic"),("died","Died")],
        default="ongoing",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    @property
    def withdrawal_end_date(self):
        from datetime import timedelta
        return self.date + timedelta(days=self.withdrawal_days)


class Vaccination(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="vaccinations")
    animal = models.ForeignKey(
        "animals.Animal", on_delete=models.CASCADE, related_name="vaccinations",
        null=True, blank=True,
    )
    shed = models.ForeignKey(
        "tenants.Shed", on_delete=models.SET_NULL, null=True, blank=True, related_name="vaccinations"
    )
    is_group_vaccination = models.BooleanField(default=False)
    vaccine_name = models.CharField(max_length=200)
    batch_number = models.CharField(max_length=100, blank=True)
    date = models.DateField()
    next_due_date = models.DateField(null=True, blank=True)
    dose = models.CharField(max_length=50, blank=True)
    administered_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="vaccinations_given"
    )
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]


class Deworming(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="dewormings")
    animal = models.ForeignKey(
        "animals.Animal", on_delete=models.CASCADE, related_name="dewormings",
        null=True, blank=True,
    )
    shed = models.ForeignKey(
        "tenants.Shed", on_delete=models.SET_NULL, null=True, blank=True, related_name="dewormings"
    )
    is_group_deworming = models.BooleanField(default=False)
    product = models.CharField(max_length=200)
    dose = models.CharField(max_length=100, blank=True)
    date = models.DateField()
    next_due_date = models.DateField(null=True, blank=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]


class DiseaseEvent(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="disease_events")
    animal = models.ForeignKey("animals.Animal", on_delete=models.CASCADE, related_name="disease_events")
    date = models.DateField()
    disease_name = models.CharField(max_length=200)
    severity = models.CharField(
        max_length=10,
        choices=[("mild","Mild"),("moderate","Moderate"),("severe","Severe")],
        default="mild",
    )
    symptoms = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    resolved_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
