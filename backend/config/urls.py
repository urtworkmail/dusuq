from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.cache import cache_page
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("django-admin/", admin.site.urls),

    # API schema — drf-spectacular re-introspects every view/serializer in
    # the whole project on every single request with no caching of its own,
    # which got slow enough (60+s) to be a real problem as the API surface
    # grew. The schema is static between deploys, so cache it for a day —
    # Django's implicit default LocMemCache is enough, no new infra needed.
    path("api/schema/", cache_page(60 * 60 * 24)(SpectacularAPIView.as_view()), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),

    # Health check (no auth)
    path("api/health/", include("apps.tenants.urls_health")),

    # Public marketing site endpoints (no auth, no tenant)
    path("api/public/contact/", include("apps.contact.urls")),
    path("api/public/tickets/", include("apps.tickets.urls")),
    path("api/public/plans/", include("apps.subscriptions.urls_public")),

    # Auth
    path("api/auth/", include("apps.users.urls")),

    # Feature modules
    path("api/tenants/", include("apps.tenants.urls")),
    path("api/animals/", include("apps.animals.urls")),
    path("api/reproduction/", include("apps.reproduction.urls")),
    path("api/health-mgmt/", include("apps.health.urls")),
    path("api/milk/", include("apps.milk.urls")),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/inventory/", include("apps.inventory.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/reports/", include("apps.reports.urls")),
    path("api/vetassist/", include("apps.vetassist.urls")),
    path("api/subscriptions/", include("apps.subscriptions.urls")),
    path("api/payroll/", include("apps.payroll.urls")),
    path("api/data-import/", include("apps.data_import.urls")),

    # Platform (SaaS owner) admin — superuser-only, cross-tenant. Exempted
    # from TenantMiddleware's tenant resolution (see apps/tenants/middleware.py
    # EXEMPT_PATHS) since it deliberately operates across every tenant.
    path("api/platform-admin/", include("apps.platform_admin.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
