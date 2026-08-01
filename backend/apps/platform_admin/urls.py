from django.urls import path
from . import views

urlpatterns = [
    path("dashboard/", views.dashboard_metrics, name="platform-admin-dashboard"),
    path("live/", views.live_snapshot, name="platform-admin-live"),
    path("audit-log/", views.AuditLogListView.as_view(), name="platform-admin-audit-log"),
]
