from rest_framework.permissions import BasePermission
from .models import Role


class IsTenantOwner(BasePermission):
    """Only the farm Owner can perform this action."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == Role.OWNER
        )


class IsTenantManager(BasePermission):
    """Owner or Farm Manager."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (Role.OWNER, Role.MANAGER)
        )


class IsSameTenant(BasePermission):
    """Ensure user belongs to the request tenant."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.tenant is None:
            return False
        return str(request.user.tenant_id) == str(request.tenant.id)
