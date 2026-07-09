from django.contrib import admin
from .models import Animal


@admin.register(Animal)
class AnimalAdmin(admin.ModelAdmin):
    list_display = ["tag_number", "name", "breed", "sex", "status", "shed", "tenant", "is_active"]
    list_filter = ["status", "sex", "tenant", "is_active"]
    search_fields = ["tag_number", "name"]
    raw_id_fields = ["dam"]
    readonly_fields = ["created_at", "updated_at"]
