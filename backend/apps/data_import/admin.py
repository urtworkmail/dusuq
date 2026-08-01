from django.contrib import admin
from .models import ImportJob


@admin.register(ImportJob)
class ImportJobAdmin(admin.ModelAdmin):
    list_display = ["tenant", "data_type", "status", "success_count", "error_count", "created_at"]
    list_filter = ["data_type", "status"]
    search_fields = ["tenant__name", "file_name"]
