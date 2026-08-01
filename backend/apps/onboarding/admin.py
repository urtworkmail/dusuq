from django.contrib import admin
from .models import TenantOnboarding


@admin.register(TenantOnboarding)
class TenantOnboardingAdmin(admin.ModelAdmin):
    list_display = ["tenant", "tour_completed", "checklist_dismissed", "updated_at"]
    list_filter = ["tour_completed", "checklist_dismissed"]
    search_fields = ["tenant__name"]
