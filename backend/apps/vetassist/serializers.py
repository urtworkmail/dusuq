from rest_framework import serializers

from .models import VetAssistQuery, VetAssistReport, VetAssistForecast, EntityType, ForecastMetric


class VetAssistQuerySerializer(serializers.ModelSerializer):
    class Meta:
        model = VetAssistQuery
        fields = ["id", "question", "answer", "sources", "used_external_research", "created_at"]
        read_only_fields = ["id", "answer", "sources", "used_external_research", "created_at"]


class VetAssistQueryRequestSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=2000)
    entity_type = serializers.ChoiceField(choices=EntityType.choices, required=False, allow_null=True)
    entity_id = serializers.CharField(max_length=100, required=False, allow_blank=True)


class VetAssistReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = VetAssistReport
        fields = [
            "id", "entity_type", "entity_id", "include_research",
            "content", "used_external_research", "created_at",
        ]
        read_only_fields = ["id", "content", "used_external_research", "created_at"]


class VetAssistReportRequestSerializer(serializers.Serializer):
    entity_type = serializers.ChoiceField(choices=EntityType.choices)
    entity_id = serializers.CharField(max_length=100, required=False, allow_blank=True)
    include_research = serializers.BooleanField(default=False)


class VetAssistForecastSerializer(serializers.ModelSerializer):
    class Meta:
        model = VetAssistForecast
        fields = [
            "id", "metric", "scope", "scope_id", "horizon_days", "content", "created_at",
        ]
        read_only_fields = ["id", "content", "created_at"]


class VetAssistForecastRequestSerializer(serializers.Serializer):
    metric = serializers.ChoiceField(choices=ForecastMetric.choices)
    scope = serializers.ChoiceField(choices=EntityType.choices, default=EntityType.FARM)
    scope_id = serializers.CharField(max_length=100, required=False, allow_blank=True)
    horizon_days = serializers.IntegerField(default=30, min_value=1, max_value=365)
