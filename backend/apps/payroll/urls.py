from django.urls import path
from . import views

urlpatterns = [
    path("dashboard/", views.payroll_dashboard, name="payroll-dashboard"),

    path("employees/", views.EmployeeListCreateView.as_view(), name="employee-list"),
    path("employees/<int:pk>/", views.EmployeeDetailView.as_view(), name="employee-detail"),
    path("employees/<int:employee_id>/ledger/", views.employee_ledger, name="employee-ledger"),

    path("salary-payments/", views.SalaryPaymentListCreateView.as_view(), name="salary-payment-list"),
    path("salary-payments/<int:pk>/", views.SalaryPaymentDetailView.as_view(), name="salary-payment-detail"),

    path("advances/", views.AdvanceListCreateView.as_view(), name="advance-list"),
    path("advances/<int:pk>/", views.AdvanceDetailView.as_view(), name="advance-detail"),
]
