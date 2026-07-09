from django.urls import path
from . import views

urlpatterns = [
    path("", views.AnimalListCreateView.as_view(), name="animal-list"),
    path("<int:pk>/", views.AnimalDetailView.as_view(), name="animal-detail"),
    path("summary/", views.animal_summary, name="animal-summary"),
]
