from rest_framework import serializers
from .models import MilkRecord, ConsumptionHead, MilkConsumption, MilkDispatch


class MilkRecordSerializer(serializers.ModelSerializer):
    animal_tag = serializers.CharField(source="animal.tag_number", read_only=True)
    animal_name = serializers.CharField(source="animal.display_name", read_only=True)

    class Meta:
        model = MilkRecord
        exclude = ["tenant"]
        read_only_fields = ["created_at"]

    def validate_animal(self, animal):
        if animal.tenant_id != self.context["request"].tenant.id:
            raise serializers.ValidationError("Animal does not belong to this farm.")
        if not animal.is_milking:
            raise serializers.ValidationError("Animal is not in milking status.")
        return animal

    def validate(self, attrs):
        request = self.context["request"]
        qs = MilkRecord.objects.filter(
            tenant=request.tenant,
            animal=attrs["animal"],
            date=attrs["date"],
            session=attrs["session"],
        )
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "A record for this animal, date and session already exists."
            )
        return attrs


class BulkMilkRecordSerializer(serializers.Serializer):
    """Accept a list of milk records for bulk create/update."""
    records = MilkRecordSerializer(many=True)

    def create(self, validated_data):
        request = self.context["request"]
        created = []
        for record in validated_data["records"]:
            obj, _ = MilkRecord.objects.update_or_create(
                tenant=request.tenant,
                animal=record["animal"],
                date=record["date"],
                session=record["session"],
                defaults={
                    "litres": record["litres"],
                    "fat_percent": record.get("fat_percent"),
                    "snf_percent": record.get("snf_percent"),
                    "notes": record.get("notes", ""),
                    "recorded_by": request.user,
                },
            )
            created.append(obj)
        return created


class ConsumptionHeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsumptionHead
        exclude = ["tenant"]


class MilkConsumptionSerializer(serializers.ModelSerializer):
    head_name = serializers.CharField(source="head.name", read_only=True)

    class Meta:
        model = MilkConsumption
        exclude = ["tenant"]
        read_only_fields = ["created_at"]


class MilkDispatchSerializer(serializers.ModelSerializer):
    outstanding = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = MilkDispatch
        exclude = ["tenant"]
        read_only_fields = ["created_at"]
