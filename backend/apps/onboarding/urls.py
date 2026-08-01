from django.urls import path
from . import views

urlpatterns = [
    path("status/", views.onboarding_status, name="onboarding-status"),
    path("tour-complete/", views.mark_tour_complete, name="onboarding-tour-complete"),
    path("dismiss-checklist/", views.dismiss_checklist, name="onboarding-dismiss-checklist"),
]
