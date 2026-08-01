from rest_framework.permissions import BasePermission


class IsPlatformAdmin(BasePermission):
    """
    Platform (SaaS owner) admin access — reuses Django's built-in superuser
    flag rather than inventing a new role. Deliberately not tied to any
    tenant's `role` field (e.g. Role.OWNER), since that's a farm-level
    concept and has nothing to do with operating the platform itself.
    """
    message = "Platform admin access required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)
