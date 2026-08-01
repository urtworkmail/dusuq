from django.urls import path
from . import views

urlpatterns = [
    path("jobs/", views.ImportJobListView.as_view(), name="import-job-list"),

    path("animals/template/", views.animals_template, name="import-animals-template"),
    path("animals/columns/", views.animals_columns, name="import-animals-columns"),
    path("animals/preview/", views.animals_preview, name="import-animals-preview"),
    path("animals/commit/", views.animals_commit, name="import-animals-commit"),

    path("milk/template/", views.milk_template, name="import-milk-template"),
    path("milk/columns/", views.milk_columns, name="import-milk-columns"),
    path("milk/preview/", views.milk_preview, name="import-milk-preview"),
    path("milk/commit/", views.milk_commit, name="import-milk-commit"),

    path("inseminations/template/", views.inseminations_template, name="import-inseminations-template"),
    path("inseminations/columns/", views.inseminations_columns, name="import-inseminations-columns"),
    path("inseminations/preview/", views.inseminations_preview, name="import-inseminations-preview"),
    path("inseminations/commit/", views.inseminations_commit, name="import-inseminations-commit"),
]
