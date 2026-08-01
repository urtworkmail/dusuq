from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import AuditLog
from apps.tenants.models import Tenant
from apps.subscriptions.models import Plan, Subscription, Invoice, AIUsageRecord
from apps.tickets.models import SupportTicket

User = get_user_model()


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


class FarmListSerializer(serializers.ModelSerializer):
    subscription_status = serializers.CharField(source="subscription.status", read_only=True, default=None)
    plan_name = serializers.CharField(source="subscription.plan.name", read_only=True, default=None)
    user_count = serializers.SerializerMethodField()
    animal_count = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            "id", "name", "slug", "owner_email", "phone", "city", "district", "province",
            "country", "is_active", "created_at", "subscription_status", "plan_name",
            "user_count", "animal_count",
        ]

    def get_user_count(self, obj):
        return obj.users.count()

    def get_animal_count(self, obj):
        return obj.animals.filter(is_active=True).count()


class FarmDetailSerializer(serializers.ModelSerializer):
    subscription = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()
    animal_count = serializers.SerializerMethodField()
    milk_total_litres_30d = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            "id", "name", "slug", "owner_email", "phone", "address", "city", "district",
            "province", "country", "currency", "timezone", "is_active", "created_at",
            "updated_at", "subscription", "user_count", "animal_count", "milk_total_litres_30d",
        ]

    def get_subscription(self, obj):
        sub = getattr(obj, "subscription", None)
        if not sub:
            return None
        return {
            "status": sub.status,
            "gateway": sub.gateway,
            "plan": sub.plan.name if sub.plan else None,
            "trial_end": sub.trial_end,
            "current_period_end": sub.current_period_end,
            "is_access_active": sub.is_access_active,
        }

    def get_user_count(self, obj):
        return obj.users.count()

    def get_animal_count(self, obj):
        return obj.animals.filter(is_active=True).count()

    def get_milk_total_litres_30d(self, obj):
        from datetime import date, timedelta
        from django.db.models import Sum
        from apps.milk.models import MilkRecord
        start = date.today() - timedelta(days=30)
        total = MilkRecord.objects.filter(tenant=obj, date__gte=start).aggregate(t=Sum("litres"))["t"]
        return float(total or 0)


class FarmToggleActiveSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()


class PlatformUserSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "first_name", "last_name", "role", "tenant", "tenant_name",
            "is_active", "is_superuser", "date_joined", "last_login", "last_activity",
        ]


class PlanAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = [
            "id", "slug", "name", "tagline", "price_monthly_pkr",
            "has_ai_assistant", "has_priority_support", "has_custom_agents", "has_beta_access",
            "stripe_price_id", "payfast_plan_id", "is_active", "sort_order", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class SubscriptionAdminSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    plan_name = serializers.CharField(source="plan.name", read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id", "tenant", "tenant_name", "plan", "plan_name", "status", "gateway",
            "gateway_customer_id", "gateway_subscription_id", "trial_end",
            "current_period_start", "current_period_end", "canceled_at", "created_at",
        ]
        read_only_fields = ["id", "tenant", "created_at"]


class InvoiceAdminSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "tenant", "tenant_name", "subscription", "period_start", "period_end",
            "plan_amount_pkr", "ai_usage_amount_usd", "status", "gateway",
            "gateway_invoice_id", "paid_at", "created_at",
        ]
        read_only_fields = ["id", "tenant", "subscription", "created_at"]


class AIUsageAdminSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True, default=None)

    class Meta:
        model = AIUsageRecord
        fields = [
            "id", "tenant", "tenant_name", "user", "user_email", "kind", "model_name",
            "input_tokens", "output_tokens", "api_cost_usd", "surcharge_percent",
            "billed_amount_usd", "created_at",
        ]


class SupportTicketAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = [
            "id", "ticket_number", "organization_name", "account_username", "email",
            "subject", "description", "status", "priority", "staff_notes",
            "source_ip", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "ticket_number", "organization_name", "account_username", "email",
            "subject", "description", "source_ip", "created_at", "updated_at",
        ]
