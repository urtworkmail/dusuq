from django.contrib import admin
from .models import Tenant, SMTPConfig, Shed, AnimalGroup, Breed


class SMTPConfigInline(admin.StackedInline):
    model = SMTPConfig
    can_delete = False
    extra = 0


class ShedInline(admin.TabularInline):
    model = Shed
    extra = 1


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "owner_email", "is_active", "created_at"]
    list_filter = ["is_active", "country"]
    search_fields = ["name", "slug", "owner_email"]
    readonly_fields = ["id", "created_at", "updated_at"]
    inlines = [SMTPConfigInline, ShedInline]


@admin.register(SMTPConfig)
class SMTPConfigAdmin(admin.ModelAdmin):
    list_display = ["tenant", "host", "port", "username", "is_verified", "last_tested_at"]
    list_filter = ["is_verified", "use_tls"]
    search_fields = ["tenant__name", "username"]


@admin.register(Shed)
class ShedAdmin(admin.ModelAdmin):
    list_display = ["name", "tenant", "capacity", "is_active"]
    list_filter = ["tenant", "is_active"]


@admin.register(AnimalGroup)
class AnimalGroupAdmin(admin.ModelAdmin):
    list_display = ["name", "tenant"]
    list_filter = ["tenant"]


@admin.register(Breed)
class BreedAdmin(admin.ModelAdmin):
    list_display = ["name", "species", "is_global", "tenant"]
    list_filter = ["species", "is_global"]
