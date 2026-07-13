from rest_framework import serializers

from .models import SupportTicket


class SupportTicketCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = [
            "ticket_number", "organization_name", "account_username", "email",
            "subject", "description", "status", "priority", "created_at",
        ]
        read_only_fields = ["ticket_number", "status", "priority", "created_at"]


class SupportTicketStatusSerializer(serializers.ModelSerializer):
    """Public-facing status lookup — no organization, account, or description details."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = SupportTicket
        fields = ["ticket_number", "subject", "status", "status_display", "created_at", "updated_at"]
