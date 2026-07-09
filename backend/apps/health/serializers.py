from rest_framework import serializers
from .models import Treatment, Vaccination, Deworming, DiseaseEvent


class TreatmentSerializer(serializers.ModelSerializer):
    animal_tag = serializers.CharField(source="animal.tag_number", read_only=True)
    animal_name = serializers.CharField(source="animal.display_name", read_only=True)
    administered_by_name = serializers.CharField(source="administered_by.get_full_name", read_only=True)
    withdrawal_end_date = serializers.DateField(read_only=True)

    class Meta:
        model = Treatment
        exclude = ["tenant"]
        read_only_fields = ["created_at"]

    def validate_animal(self, animal):
        if animal.tenant_id != self.context["request"].tenant.id:
            raise serializers.ValidationError("Animal does not belong to this farm.")
        return animal


class VaccinationSerializer(serializers.ModelSerializer):
    animal_tag = serializers.CharField(source="animal.tag_number", read_only=True)
    shed_name = serializers.CharField(source="shed.name", read_only=True)
    administered_by_name = serializers.CharField(source="administered_by.get_full_name", read_only=True)

    class Meta:
        model = Vaccination
        exclude = ["tenant"]
        read_only_fields = ["created_at"]


class DewormingSerializer(serializers.ModelSerializer):
    animal_tag = serializers.CharField(source="animal.tag_number", read_only=True)
    shed_name = serializers.CharField(source="shed.name", read_only=True)

    class Meta:
        model = Deworming
        exclude = ["tenant"]
        read_only_fields = ["created_at"]


class DiseaseEventSerializer(serializers.ModelSerializer):
    animal_tag = serializers.CharField(source="animal.tag_number", read_only=True)
    animal_name = serializers.CharField(source="animal.display_name", read_only=True)

    class Meta:
        model = DiseaseEvent
        exclude = ["tenant"]
        read_only_fields = ["created_at"]

    def validate_animal(self, animal):
        if animal.tenant_id != self.context["request"].tenant.id:
            raise serializers.ValidationError("Animal does not belong to this farm.")
        return animal
