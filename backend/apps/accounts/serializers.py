from rest_framework import serializers
from .models import AccountHead, Transaction, Asset


class AccountHeadSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True)
    children = serializers.SerializerMethodField()

    class Meta:
        model = AccountHead
        exclude = ["tenant"]
        read_only_fields = ["created_at"]

    def get_children(self, obj):
        if obj.children.exists():
            return AccountHeadSerializer(obj.children.all(), many=True).data
        return []


class AccountHeadSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountHead
        fields = ["id", "name", "account_type", "code"]


class TransactionSerializer(serializers.ModelSerializer):
    debit_account_name = serializers.CharField(source="debit_account.name", read_only=True)
    credit_account_name = serializers.CharField(source="credit_account.name", read_only=True)
    entered_by_name = serializers.CharField(source="entered_by.get_full_name", read_only=True)

    class Meta:
        model = Transaction
        exclude = ["tenant"]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        request = self.context["request"]
        for field in ["debit_account", "credit_account"]:
            account = attrs.get(field)
            if account and account.tenant_id != request.tenant.id:
                raise serializers.ValidationError({field: "Account does not belong to this farm."})
        if attrs.get("debit_account") == attrs.get("credit_account"):
            raise serializers.ValidationError("Debit and credit account must be different.")
        return attrs

    def create(self, validated_data):
        validated_data["entered_by"] = self.context["request"].user
        return super().create(validated_data)


class AssetSerializer(serializers.ModelSerializer):
    current_value = serializers.SerializerMethodField()
    total_depreciation = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        exclude = ["tenant"]
        read_only_fields = ["created_at"]

    def get_current_value(self, obj):
        return round(obj.current_value(), 2)

    def get_total_depreciation(self, obj):
        return round(float(obj.purchase_value) - obj.current_value(), 2)
