from django.contrib import admin
from .models import Employee, SalaryPayment, Advance


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ["name", "tenant", "designation", "monthly_salary", "is_active", "joining_date"]
    list_filter = ["is_active", "tenant"]
    search_fields = ["name", "phone", "cnic"]


@admin.register(SalaryPayment)
class SalaryPaymentAdmin(admin.ModelAdmin):
    list_display = ["employee", "month", "amount_paid", "payment_date"]
    list_filter = ["tenant"]
    search_fields = ["employee__name"]


@admin.register(Advance)
class AdvanceAdmin(admin.ModelAdmin):
    list_display = ["employee", "amount", "date", "is_settled"]
    list_filter = ["is_settled", "tenant"]
    search_fields = ["employee__name"]
