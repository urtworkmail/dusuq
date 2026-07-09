from rest_framework import serializers
from apps.animals.models import Animal, AnimalStatus
from .models import Insemination, PregnancyTest, DryOff, Calving, Abortion


class InseminationSerializer(serializers.ModelSerializer):
    animal_tag = serializers.CharField(source="animal.tag_number", read_only=True)
    animal_name = serializers.CharField(source="animal.display_name", read_only=True)
    technician_name = serializers.CharField(source="technician.get_full_name", read_only=True)
    expected_calving_date = serializers.DateField(read_only=True)

    class Meta:
        model = Insemination
        exclude = ["tenant"]
        read_only_fields = ["created_at"]

    def validate_animal(self, animal):
        request = self.context["request"]
        if animal.tenant_id != request.tenant.id:
            raise serializers.ValidationError("Animal does not belong to this farm.")
        return animal

    def create(self, validated_data):
        instance = super().create(validated_data)
        # Update animal status to inseminated
        animal = instance.animal
        if animal.status in (AnimalStatus.OPEN, AnimalStatus.HEIFER):
            animal.status = AnimalStatus.INSEMINATED
            animal.save(update_fields=["status"])
        return instance


class PregnancyTestSerializer(serializers.ModelSerializer):
    animal_tag = serializers.CharField(source="animal.tag_number", read_only=True)
    animal_name = serializers.CharField(source="animal.display_name", read_only=True)
    conducted_by_name = serializers.CharField(source="conducted_by.get_full_name", read_only=True)

    class Meta:
        model = PregnancyTest
        exclude = ["tenant"]
        read_only_fields = ["created_at"]

    def validate_animal(self, animal):
        request = self.context["request"]
        if animal.tenant_id != request.tenant.id:
            raise serializers.ValidationError("Animal does not belong to this farm.")
        return animal

    def create(self, validated_data):
        instance = super().create(validated_data)
        animal = instance.animal
        from .models import PregnancyResult
        if instance.result == PregnancyResult.POSITIVE:
            animal.status = AnimalStatus.PREGNANT
            animal.save(update_fields=["status"])
        elif instance.result == PregnancyResult.NEGATIVE:
            animal.status = AnimalStatus.OPEN
            animal.save(update_fields=["status"])
        return instance


class DryOffSerializer(serializers.ModelSerializer):
    animal_tag = serializers.CharField(source="animal.tag_number", read_only=True)
    animal_name = serializers.CharField(source="animal.display_name", read_only=True)

    class Meta:
        model = DryOff
        exclude = ["tenant"]
        read_only_fields = ["created_at"]

    def validate_animal(self, animal):
        request = self.context["request"]
        if animal.tenant_id != request.tenant.id:
            raise serializers.ValidationError("Animal does not belong to this farm.")
        return animal

    def create(self, validated_data):
        instance = super().create(validated_data)
        animal = instance.animal
        animal.status = AnimalStatus.DRY
        animal.save(update_fields=["status"])
        return instance


class CalvingSerializer(serializers.ModelSerializer):
    dam_tag = serializers.CharField(source="dam.tag_number", read_only=True)
    dam_name = serializers.CharField(source="dam.display_name", read_only=True)

    class Meta:
        model = Calving
        exclude = ["tenant"]
        read_only_fields = ["created_at"]

    def validate_dam(self, animal):
        request = self.context["request"]
        if animal.tenant_id != request.tenant.id:
            raise serializers.ValidationError("Animal does not belong to this farm.")
        return animal

    def create(self, validated_data):
        instance = super().create(validated_data)
        dam = instance.dam
        # Increment lactation, set status to open
        dam.lactation_number += 1
        dam.status = AnimalStatus.OPEN
        dam.save(update_fields=["lactation_number", "status"])
        return instance


class AbortionSerializer(serializers.ModelSerializer):
    animal_tag = serializers.CharField(source="animal.tag_number", read_only=True)
    animal_name = serializers.CharField(source="animal.display_name", read_only=True)

    class Meta:
        model = Abortion
        exclude = ["tenant"]
        read_only_fields = ["created_at"]

    def validate_animal(self, animal):
        request = self.context["request"]
        if animal.tenant_id != request.tenant.id:
            raise serializers.ValidationError("Animal does not belong to this farm.")
        return animal

    def create(self, validated_data):
        instance = super().create(validated_data)
        animal = instance.animal
        animal.status = AnimalStatus.OPEN
        animal.save(update_fields=["status"])
        return instance
