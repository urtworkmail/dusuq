from django.urls import path
from . import views

urlpatterns = [
    path("dashboard/", views.reproduction_dashboard, name="repro-dashboard"),
    path("technician-performance/", views.technician_performance, name="tech-performance"),
    path("expected-tasks/", views.expected_tasks, name="expected-tasks"),

    path("inseminations/", views.InseminationListCreateView.as_view(), name="insemination-list"),
    path("inseminations/<int:pk>/", views.InseminationDetailView.as_view(), name="insemination-detail"),

    path("pregnancy-tests/", views.PregnancyTestListCreateView.as_view(), name="preg-test-list"),
    path("pregnancy-tests/<int:pk>/", views.PregnancyTestDetailView.as_view(), name="preg-test-detail"),

    path("dry-offs/", views.DryOffListCreateView.as_view(), name="dryoff-list"),
    path("dry-offs/<int:pk>/", views.DryOffDetailView.as_view(), name="dryoff-detail"),

    path("calvings/", views.CalvingListCreateView.as_view(), name="calving-list"),
    path("calvings/<int:pk>/", views.CalvingDetailView.as_view(), name="calving-detail"),

    path("abortions/", views.AbortionListCreateView.as_view(), name="abortion-list"),
    path("abortions/<int:pk>/", views.AbortionDetailView.as_view(), name="abortion-detail"),
]
