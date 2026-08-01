from django.urls import path
from . import views

urlpatterns = [
    path("jobs/", views.ImportJobListView.as_view(), name="import-job-list"),
    path("animals/template/", views.animals_template, name="import-animals-template"),
    path("animals/preview/", views.animals_preview, name="import-animals-preview"),
    path("animals/commit/", views.animals_commit, name="import-animals-commit"),
]
