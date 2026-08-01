from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    action_display = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id", "action", "action_display", "tenant", "tenant_name", "user", "user_email",
            "target_model", "target_id", "description", "ip_address", "created_at",
        ]
