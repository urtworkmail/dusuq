from django.urls import path

from . import views

urlpatterns = [
    path("", views.public_plan_list, name="public-plan-list"),
]
