from rest_framework import serializers
from apps.common.serializers import NullableRelatedFieldMixin
from apps.tenants.serializers import BreedSerializer, ShedSerializer, AnimalGroupSerializer
from .models import Animal


class AnimalListSerializer(serializers.ModelSerializer):
    breed_name = serializers.CharField(source="breed.name", read_only=True)
    shed_name = serializers.CharField(source="shed.name", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True)
    display_name = serializers.CharField(read_only=True)
    age_months = serializers.SerializerMethodField()

    class Meta:
        model = Animal
        fields = [
            "id", "tag_number", "name", "display_name", "breed", "breed_name",
            "sex", "date_of_birth", "age_months", "status", "shed", "shed_name",
            "group", "group_name", "lactation_number", "is_active", "created_at",
        ]

    def get_age_months(self, obj):
        if not obj.date_of_birth:
            return None
        from datetime import date
        today = date.today()
        delta = today - obj.date_of_birth
        return round(delta.days / 30.44)


class AnimalDetailSerializer(serializers.ModelSerializer):
    breed_detail = BreedSerializer(source="breed", read_only=True)
    shed_detail = ShedSerializer(source="shed", read_only=True)
    group_detail = AnimalGroupSerializer(source="group", read_only=True)
    dam_tag = serializers.CharField(source="dam.tag_number", read_only=True)
    sire_display = serializers.SerializerMethodField()
    age_months = serializers.SerializerMethodField()
    is_milking = serializers.BooleanField(read_only=True)

    class Meta:
        model = Animal
        exclude = ["tenant"]
        read_only_fields = ["created_at", "updated_at"]

    def get_sire_display(self, obj):
        if obj.sire_id:
            return obj.sire.tag_number
        return obj.sire_tag or None

    def get_age_months(self, obj):
        if not obj.date_of_birth:
            return None
        from datetime import date
        delta = date.today() - obj.date_of_birth
        return round(delta.days / 30.44)


class AnimalCreateSerializer(NullableRelatedFieldMixin, serializers.ModelSerializer):
    class Meta:
        model = Animal
        exclude = ["tenant", "created_at", "updated_at"]

    def validate_tag_number(self, value):
        request = self.context["request"]
        qs = Animal.objects.filter(tenant=request.tenant, tag_number=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Tag number already exists in this farm.")
        return value

    def _validate_same_tenant(self, value, field_name):
        # Animal uses sequential integer PKs (not UUIDs), so a cross-tenant
        # animal ID is trivially guessable/enumerable — without this check a
        # tenant could link dam/sire to another tenant's animal and have it
        # surface via dam_tag/sire_display or the /pedigree/ endpoint.
        if value is not None and value.tenant_id != self.context["request"].tenant.id:
            raise serializers.ValidationError(f"{field_name} does not belong to this farm.")
        return value

    def validate_dam(self, value):
        return self._validate_same_tenant(value, "Dam")

    def validate_sire(self, value):
        return self._validate_same_tenant(value, "Sire")
