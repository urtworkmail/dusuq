from rest_framework import serializers
from .models import Employee, SalaryPayment, Advance


class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        exclude = ["tenant"]
        read_only_fields = ["created_at"]


class SalaryPaymentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.name", read_only=True)

    class Meta:
        model = SalaryPayment
        exclude = ["tenant", "entered_by"]
        read_only_fields = ["created_at"]

    def validate_employee(self, value):
        request = self.context["request"]
        if value.tenant_id != request.tenant.id:
            raise serializers.ValidationError("Employee does not belong to this farm.")
        return value

    def create(self, validated_data):
        validated_data["entered_by"] = self.context["request"].user
        return super().create(validated_data)


class AdvanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.name", read_only=True)

    class Meta:
        model = Advance
        exclude = ["tenant"]
        read_only_fields = ["created_at"]

    def validate_employee(self, value):
        request = self.context["request"]
        if value.tenant_id != request.tenant.id:
            raise serializers.ValidationError("Employee does not belong to this farm.")
        return value
