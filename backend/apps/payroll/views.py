from datetime import date
from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Employee, SalaryPayment, Advance
from .serializers import EmployeeSerializer, SalaryPaymentSerializer, AdvanceSerializer


class EmployeeListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EmployeeSerializer

    def get_queryset(self):
        return Employee.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EmployeeSerializer

    def get_queryset(self):
        return Employee.objects.filter(tenant=self.request.tenant)


class SalaryPaymentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SalaryPaymentSerializer

    def get_queryset(self):
        qs = SalaryPayment.objects.filter(tenant=self.request.tenant).select_related("employee")
        employee_id = self.request.query_params.get("employee")
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class SalaryPaymentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SalaryPaymentSerializer

    def get_queryset(self):
        return SalaryPayment.objects.filter(tenant=self.request.tenant)


class AdvanceListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AdvanceSerializer

    def get_queryset(self):
        qs = Advance.objects.filter(tenant=self.request.tenant).select_related("employee")
        employee_id = self.request.query_params.get("employee")
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class AdvanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AdvanceSerializer

    def get_queryset(self):
        return Advance.objects.filter(tenant=self.request.tenant)


def _employee_ledger_rows(tenant, employee):
    """
    Builds a running ledger for one employee: one salary-accrual entry per
    calendar month from joining_date through the current month (or
    leaving_date if earlier), interleaved with actual payments and advances
    (both of which reduce the balance the farm owes the employee).
    """
    today = date.today()
    end_month = min(employee.leaving_date or today, today).replace(day=1)

    entries = []
    cursor = employee.joining_date.replace(day=1)
    while cursor <= end_month:
        entries.append({
            "date": cursor,
            "type": "accrual",
            "description": f"Salary accrued — {cursor.strftime('%B %Y')}",
            "amount": float(employee.monthly_salary),
        })
        cursor = date(cursor.year + 1, 1, 1) if cursor.month == 12 else date(cursor.year, cursor.month + 1, 1)

    for p in SalaryPayment.objects.filter(tenant=tenant, employee=employee):
        entries.append({
            "date": p.payment_date,
            "type": "payment",
            "description": p.notes or f"Salary payment — {p.month.strftime('%B %Y')}",
            "amount": -float(p.amount_paid),
        })

    for a in Advance.objects.filter(tenant=tenant, employee=employee):
        entries.append({
            "date": a.date,
            "type": "advance",
            "description": a.reason or "Advance",
            "amount": -float(a.amount),
        })

    entries.sort(key=lambda e: e["date"])
    running = 0.0
    rows = []
    for e in entries:
        running += e["amount"]
        rows.append({**e, "date": str(e["date"]), "balance": round(running, 2)})
    return rows, round(running, 2)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def employee_ledger(request, employee_id):
    """Per-employee ledger: salary accrued vs. paid/advanced, with a running balance owed."""
    tenant = request.tenant
    try:
        employee = Employee.objects.get(id=employee_id, tenant=tenant)
    except Employee.DoesNotExist:
        return Response({"detail": "Employee not found."}, status=404)

    rows, balance_owed = _employee_ledger_rows(tenant, employee)
    return Response({
        "employee": employee.name,
        "monthly_salary": float(employee.monthly_salary),
        "rows": rows,
        "balance_owed": balance_owed,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payroll_dashboard(request):
    """Farm-wide payroll summary: headcount, monthly payroll cost, and total owed across all employees."""
    tenant = request.tenant
    employees = Employee.objects.filter(tenant=tenant, is_active=True)
    total_monthly_payroll = sum(float(e.monthly_salary) for e in employees)
    total_owed = 0.0
    for e in Employee.objects.filter(tenant=tenant):
        _, balance = _employee_ledger_rows(tenant, e)
        if balance > 0:
            total_owed += balance

    return Response({
        "active_employee_count": employees.count(),
        "total_monthly_payroll": round(total_monthly_payroll, 2),
        "total_owed_to_employees": round(total_owed, 2),
    })
