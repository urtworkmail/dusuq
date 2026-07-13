from django.urls import path

from .views import SupportTicketCreateView, SupportTicketStatusView

urlpatterns = [
    path("", SupportTicketCreateView.as_view(), name="ticket-create"),
    path("<str:ticket_number>/", SupportTicketStatusView.as_view(), name="ticket-status"),
]
