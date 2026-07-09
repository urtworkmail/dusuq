from django.contrib import admin
from .models import ContactInquiry


@admin.register(ContactInquiry)
class ContactInquiryAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "farm_name", "herd_size", "is_read", "created_at"]
    list_filter = ["is_read", "herd_size", "created_at"]
    search_fields = ["name", "email", "farm_name", "message"]
    readonly_fields = ["name", "email", "farm_name", "herd_size", "message", "source_ip", "created_at"]
    ordering = ["-created_at"]
