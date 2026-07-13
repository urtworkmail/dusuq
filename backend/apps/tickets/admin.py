from django.contrib import admin

from .models import SupportTicket


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ["ticket_number", "organization_name", "account_username", "subject", "status", "priority", "created_at"]
    list_filter = ["status", "priority", "created_at"]
    search_fields = ["ticket_number", "organization_name", "account_username", "email", "subject"]
    readonly_fields = ["ticket_number", "source_ip", "created_at", "updated_at"]
    fieldsets = (
        (None, {"fields": ("ticket_number", "status", "priority")}),
        ("Submitted by", {"fields": ("organization_name", "account_username", "email")}),
        ("Request", {"fields": ("subject", "description")}),
        ("Internal", {"fields": ("staff_notes", "source_ip", "created_at", "updated_at")}),
    )
