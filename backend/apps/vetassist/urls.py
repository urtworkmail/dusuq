from django.urls import path

from . import views

urlpatterns = [
    path("query/", views.query, name="vetassist-query"),
    path("reports/", views.ReportListCreateView.as_view(), name="vetassist-reports"),
    path("reports/<int:pk>/", views.ReportDetailView.as_view(), name="vetassist-report-detail"),
    path("forecast/", views.forecast, name="vetassist-forecast"),
    path("history/", views.history, name="vetassist-history"),
]
