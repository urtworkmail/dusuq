from rest_framework import serializers

from .models import Plan, Subscription, AIUsageRecord, Invoice


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = [
            "slug", "name", "tagline", "price_monthly_pkr",
            "has_ai_assistant", "has_priority_support", "has_custom_agents", "has_beta_access",
        ]


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    is_trialing = serializers.BooleanField(read_only=True)
    trial_days_left = serializers.IntegerField(read_only=True)
    is_ai_enabled = serializers.BooleanField(read_only=True)
    is_access_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "status", "gateway", "plan", "trial_end", "current_period_end",
            "is_trialing", "trial_days_left", "is_ai_enabled", "is_access_active",
        ]


class AIUsageRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIUsageRecord
        fields = [
            "id", "kind", "model_name", "input_tokens", "output_tokens",
            "api_cost_usd", "surcharge_percent", "billed_amount_usd", "created_at",
        ]


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            "id", "period_start", "period_end", "plan_amount_pkr", "ai_usage_amount_usd",
            "status", "gateway", "paid_at", "created_at",
        ]
