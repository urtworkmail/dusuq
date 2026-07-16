from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.exceptions import AuthenticationFailed

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
    Resolves the current tenant strictly from the authenticated user's own
    tenant relation — never from a client-supplied header. A request's tenant
    must never be attacker-choosable: trusting an X-Tenant-ID header here
    previously let any authenticated user read/write any other tenant's data
    (and, via IsTenantOwner-gated endpoints like password reset, take over
    another tenant's account) just by sending a different UUID.

    Exempt paths (health check, auth, admin) bypass tenant resolution.
    Once resolved, also blocks the request if the tenant's trial or
    subscription has lapsed — see SUBSCRIPTION_EXEMPT_PATHS for what stays
    reachable regardless.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_auth = JWTAuthentication()

    def __call__(self, request):
        # Skip exempt paths
        path = request.path_info
        if any(path.startswith(p) for p in EXEMPT_PATHS):
            request.tenant = None
            return self.get_response(request)

        try:
            auth_result = self.jwt_auth.authenticate(request)
        except (InvalidToken, TokenError, AuthenticationFailed):
            auth_result = None

        if auth_result is None:
            return JsonResponse(
                {"detail": "Authentication credentials were not provided or are invalid."},
                status=401,
            )

        user, _ = auth_result
        tenant = user.tenant
        if tenant is None or not tenant.is_active:
            return JsonResponse(
                {"detail": "No active tenant is associated with this account."},
                status=403,
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
