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


class TenantMiddleware:
    """
    Resolves the current tenant from the X-Tenant-ID request header.
    Sets request.tenant on every request that passes through.

    Exempt paths (health check, auth, admin) bypass tenant resolution.
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
        return self.get_response(request)
