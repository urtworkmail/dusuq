from django.urls import path
from . import views

urlpatterns = [
    path("dashboard/", views.health_dashboard, name="health-dashboard"),

    path("treatments/", views.TreatmentListCreateView.as_view(), name="treatment-list"),
    path("treatments/<int:pk>/", views.TreatmentDetailView.as_view(), name="treatment-detail"),

    path("vaccinations/", views.VaccinationListCreateView.as_view(), name="vaccination-list"),
    path("vaccinations/<int:pk>/", views.VaccinationDetailView.as_view(), name="vaccination-detail"),

    path("dewormings/", views.DewormingListCreateView.as_view(), name="deworming-list"),
    path("dewormings/<int:pk>/", views.DewormingDetailView.as_view(), name="deworming-detail"),

    path("diseases/", views.DiseaseEventListCreateView.as_view(), name="disease-list"),
    path("diseases/<int:pk>/", views.DiseaseEventDetailView.as_view(), name="disease-detail"),
]
