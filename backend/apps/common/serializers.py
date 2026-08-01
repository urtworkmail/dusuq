from rest_framework import serializers


class NullableRelatedFieldMixin:
    """
    An optional HTML <select> left on its default "— None —" option submits
    an empty string, not null. DRF's PrimaryKeyRelatedField only treats
    `None` as "no value" — an empty string reaches the FK lookup and fails
    with a confusing "Incorrect type" 400 before any validate_<field> method
    even runs. This normalizes "" to None for every nullable relational
    field before validation, so leaving an optional dropdown unset behaves
    the same as omitting the field entirely.

    Mix this in ahead of serializers.ModelSerializer on any serializer that
    exposes a nullable FK to a plain HTML form.
    """

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = {
                key: (None if value == "" and self._is_nullable_relation(key) else value)
                for key, value in data.items()
            }
        return super().to_internal_value(data)

    def _is_nullable_relation(self, field_name):
        field = self.fields.get(field_name)
        return isinstance(field, serializers.RelatedField) and field.allow_null
