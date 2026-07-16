from django.core.exceptions import ValidationError
from django.http import JsonResponse
from .models import Tenant

EXEMPT_PATHS = (
    "/api/health/",
    "/api/auth/register/",
    "/api/auth/login/",
    "/api/auth/token/refresh/",
    "/django-admin/",
    "/api/schema/",
    "/api/docs/",
    "/static/",
    "/media/",
    "/api/public/",
)

# Paths a tenant must still be able to reach even once their trial/subscription
# has lapsed — otherwise there's no way for them to see why, or to pay.
SUBSCRIPTION_EXEMPT_PATHS = (
    "/api/subscriptions/",
    "/api/auth/",
)


class TenantMiddleware:
    """
    Resolves the current tenant from the X-Tenant-ID request header.
    Sets request.tenant on every request that passes through.

    Exempt paths (health check, auth, admin) bypass tenant resolution.
    Once resolved, also blocks the request if the tenant's trial or
    subscription has lapsed — see SUBSCRIPTION_EXEMPT_PATHS for what stays
    reachable regardless.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip exempt paths
        path = request.path_info
        if any(path.startswith(p) for p in EXEMPT_PATHS):
            request.tenant = None
            return self.get_response(request)

        tenant_id = request.headers.get("X-Tenant-ID")
        if not tenant_id:
            return JsonResponse(
                {"detail": "X-Tenant-ID header is required."}, status=400
            )

        try:
            tenant = Tenant.objects.get(id=tenant_id, is_active=True)
        except (Tenant.DoesNotExist, ValueError, ValidationError):
            return JsonResponse(
                {"detail": "Invalid or inactive tenant."}, status=403
            )

        request.tenant = tenant

        if not any(path.startswith(p) for p in SUBSCRIPTION_EXEMPT_PATHS):
            subscription = getattr(tenant, "subscription", None)
            if subscription is not None and not subscription.is_access_active:
                return JsonResponse(
                    {
                        "detail": "Your trial or subscription has ended. Please choose a plan to continue.",
                        "code": "subscription_inactive",
                    },
                    status=402,
                )

        return self.get_response(request)
