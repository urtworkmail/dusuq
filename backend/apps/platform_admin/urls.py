from django.urls import path
from . import views

urlpatterns = [
    path("dashboard/", views.dashboard_metrics, name="platform-admin-dashboard"),
    path("live/", views.live_snapshot, name="platform-admin-live"),
    path("analytics/", views.analytics_trends, name="platform-admin-analytics"),
    path("audit-log/", views.AuditLogListView.as_view(), name="platform-admin-audit-log"),

    path("farms/", views.FarmListView.as_view(), name="platform-admin-farm-list"),
    path("farms/<uuid:pk>/", views.FarmDetailView.as_view(), name="platform-admin-farm-detail"),
    path("farms/<uuid:pk>/toggle-active/", views.farm_toggle_active, name="platform-admin-farm-toggle"),

    path("users/", views.PlatformUserListView.as_view(), name="platform-admin-user-list"),

    path("plans/", views.PlanListCreateView.as_view(), name="platform-admin-plan-list"),
    path("plans/<int:pk>/", views.PlanDetailView.as_view(), name="platform-admin-plan-detail"),

    path("subscriptions/", views.SubscriptionAdminListView.as_view(), name="platform-admin-subscription-list"),
    path("subscriptions/<int:pk>/", views.SubscriptionAdminDetailView.as_view(), name="platform-admin-subscription-detail"),

    path("invoices/", views.InvoiceAdminListView.as_view(), name="platform-admin-invoice-list"),
    path("invoices/<int:pk>/", views.InvoiceAdminDetailView.as_view(), name="platform-admin-invoice-detail"),

    path("ai-usage/", views.AIUsageAdminListView.as_view(), name="platform-admin-ai-usage-list"),

    path("support-tickets/", views.SupportTicketAdminListView.as_view(), name="platform-admin-ticket-list"),
    path("support-tickets/<uuid:pk>/", views.SupportTicketAdminDetailView.as_view(), name="platform-admin-ticket-detail"),
]
