from django.contrib import admin
from .models import Insemination, PregnancyTest, DryOff, Calving, Abortion


@admin.register(Insemination)
class InseminationAdmin(admin.ModelAdmin):
    list_display = ["animal", "insemination_type", "date", "technician", "repeat_number", "tenant"]
    list_filter = ["insemination_type", "tenant"]
    search_fields = ["animal__tag_number", "semen_batch"]
    date_hierarchy = "date"


@admin.register(PregnancyTest)
class PregnancyTestAdmin(admin.ModelAdmin):
    list_display = ["animal", "date", "method", "result", "tenant"]
    list_filter = ["result", "method", "tenant"]
    date_hierarchy = "date"


@admin.register(Calving)
class CalvingAdmin(admin.ModelAdmin):
    list_display = ["dam", "calving_date", "calving_type", "calf_tag", "calf_sex", "tenant"]
    list_filter = ["calving_type", "tenant"]
    date_hierarchy = "calving_date"


@admin.register(Abortion)
class AbortionAdmin(admin.ModelAdmin):
    list_display = ["animal", "date", "cause", "tenant"]
    list_filter = ["tenant"]
