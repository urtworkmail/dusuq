from django.urls import path
from .views import ContactInquiryCreateView

urlpatterns = [
    path("", ContactInquiryCreateView.as_view(), name="contact-create"),
]
