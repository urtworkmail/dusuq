from django.urls import path
from . import views

urlpatterns = [
    # Farm profile
    path("profile/", views.TenantDetailView.as_view(), name="tenant-detail"),

    # SMTP
    path("smtp/", views.SMTPConfigView.as_view(), name="smtp-config"),
    path("smtp/test/", views.SMTPTestView.as_view(), name="smtp-test"),

    # Sheds
    path("sheds/", views.ShedListCreateView.as_view(), name="shed-list"),
    path("sheds/<int:pk>/", views.ShedDetailView.as_view(), name="shed-detail"),

    # Animal groups
    path("groups/", views.AnimalGroupListCreateView.as_view(), name="group-list"),
    path("groups/<int:pk>/", views.AnimalGroupDetailView.as_view(), name="group-detail"),

    # Breeds
    path("breeds/", views.BreedListCreateView.as_view(), name="breed-list"),
    path("breeds/<int:pk>/", views.BreedDetailView.as_view(), name="breed-detail"),
]
