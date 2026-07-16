from rest_framework.permissions import BasePermission


class SubscriptionActive(BasePermission):
    """
    Blocks access once a trial or subscription has lapsed. Tenants with no
    Subscription row at all (shouldn't happen post-registration, but covers
    any pre-existing tenant from before this feature existed) are allowed
    through rather than locked out by a backfill gap.
    """
    message = "Your trial or subscription has ended. Please choose a plan to continue."

    def has_permission(self, request, view):
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            return True
        subscription = getattr(tenant, "subscription", None)
        if subscription is None:
            return True
        return subscription.is_access_active


class HasAIAccess(BasePermission):
    """VetAssist gate — no AI during trial, and only plans with has_ai_assistant."""
    message = "AI features (VetAssist) aren't included in your current plan or trial."

    def has_permission(self, request, view):
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            return False
        subscription = getattr(tenant, "subscription", None)
        if subscription is None:
            return False
        return subscription.is_ai_enabled
