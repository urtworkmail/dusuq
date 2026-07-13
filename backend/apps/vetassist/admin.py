from django.contrib import admin

from .models import VetAssistQuery, VetAssistReport, VetAssistForecast


@admin.register(VetAssistQuery)
class VetAssistQueryAdmin(admin.ModelAdmin):
    list_display = ["tenant", "question", "used_external_research", "created_at"]
    list_filter = ["tenant", "used_external_research"]
    search_fields = ["question", "answer"]


@admin.register(VetAssistReport)
class VetAssistReportAdmin(admin.ModelAdmin):
    list_display = ["tenant", "entity_type", "entity_id", "include_research", "created_at"]
    list_filter = ["tenant", "entity_type", "include_research"]


@admin.register(VetAssistForecast)
class VetAssistForecastAdmin(admin.ModelAdmin):
    list_display = ["tenant", "metric", "scope", "scope_id", "horizon_days", "created_at"]
    list_filter = ["tenant", "metric", "scope"]
