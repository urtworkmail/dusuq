from django.db import models
from django.core.validators import MinValueValidator


class Employee(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="employees")
    name = models.CharField(max_length=150)
    designation = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    cnic = models.CharField(max_length=20, blank=True, verbose_name="CNIC / ID Number")
    joining_date = models.DateField()
    leaving_date = models.DateField(null=True, blank=True)
    monthly_salary = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.designation or 'Employee'})"


class SalaryPayment(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="salary_payments")
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="salary_payments")
    month = models.DateField(help_text="Any date within the salary month this payment covers")
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    payment_date = models.DateField()
    notes = models.TextField(blank=True)
    entered_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="salary_payments_entered"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-payment_date"]

    def __str__(self):
        return f"{self.employee.name} — PKR {self.amount_paid} on {self.payment_date}"


class Advance(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="advances")
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="advances")
    date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    reason = models.CharField(max_length=255, blank=True)
    is_settled = models.BooleanField(
        default=False,
        help_text="Whether this advance has been fully recovered against future salary",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.employee.name} — advance PKR {self.amount} on {self.date}"
