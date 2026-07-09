from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("django-admin/", admin.site.urls),

    # API schema
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),

    # Health check (no auth)
    path("api/health/", include("apps.tenants.urls_health")),

    # Public marketing site endpoints (no auth, no tenant)
    path("api/public/contact/", include("apps.contact.urls")),

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
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
