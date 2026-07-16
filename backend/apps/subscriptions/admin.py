from django.contrib import admin

from .models import Plan, Subscription, AIUsageRecord, Invoice


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = [
        "name", "slug", "price_monthly_pkr", "has_ai_assistant",
        "has_priority_support", "has_custom_agents", "has_beta_access", "is_active",
    ]
    list_filter = ["is_active", "has_ai_assistant", "has_custom_agents"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["tenant", "plan", "status", "gateway", "trial_end", "current_period_end"]
    list_filter = ["status", "gateway", "plan"]
    search_fields = ["tenant__name", "tenant__slug", "gateway_customer_id", "gateway_subscription_id"]


@admin.register(AIUsageRecord)
class AIUsageRecordAdmin(admin.ModelAdmin):
    list_display = [
        "tenant", "kind", "model_name", "input_tokens", "output_tokens",
        "api_cost_usd", "billed_amount_usd", "invoice", "created_at",
    ]
    list_filter = ["kind", "model_name", "created_at"]
    search_fields = ["tenant__name"]
    readonly_fields = ["billed_amount_usd", "created_at"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = [
        "tenant", "period_start", "period_end", "plan_amount_pkr",
        "ai_usage_amount_usd", "status", "gateway", "paid_at",
    ]
    list_filter = ["status", "gateway"]
    search_fields = ["tenant__name", "gateway_invoice_id"]
