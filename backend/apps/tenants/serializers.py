from rest_framework import serializers
from .models import Tenant, SMTPConfig, Shed, AnimalGroup, Breed


class SMTPConfigSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = SMTPConfig
        exclude = ["tenant"]
        extra_kwargs = {"password": {"write_only": True}}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Never expose password in GET responses
        data.pop("password", None)
        return data


class TenantSerializer(serializers.ModelSerializer):
    smtp_config = SMTPConfigSerializer(read_only=True)

    class Meta:
        model = Tenant
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class TenantUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        exclude = ["id", "slug", "created_at", "updated_at"]


class ShedSerializer(serializers.ModelSerializer):
    animal_count = serializers.SerializerMethodField()

    class Meta:
        model = Shed
        exclude = ["tenant"]

    def get_animal_count(self, obj):
        return obj.animals.filter(is_active=True).count()


class AnimalGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnimalGroup
        exclude = ["tenant"]


class BreedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Breed
        fields = "__all__"
