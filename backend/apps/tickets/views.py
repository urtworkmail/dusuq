from rest_framework import generics, throttling
from rest_framework.permissions import AllowAny

from .models import SupportTicket
from .serializers import SupportTicketCreateSerializer, SupportTicketStatusSerializer


class TicketThrottle(throttling.AnonRateThrottle):
    scope = "tickets"


class SupportTicketCreateView(generics.CreateAPIView):
    """Public endpoint — anyone can open a support ticket, no login required."""
    queryset = SupportTicket.objects.all()
    serializer_class = SupportTicketCreateSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [TicketThrottle]

    def perform_create(self, serializer):
        ip = self.request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or self.request.META.get("REMOTE_ADDR")
        serializer.save(source_ip=ip)


class SupportTicketStatusView(generics.RetrieveAPIView):
    """Public endpoint — look up a ticket's status by its reference number."""
    queryset = SupportTicket.objects.all()
    serializer_class = SupportTicketStatusSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [TicketThrottle]
    lookup_field = "ticket_number"
    lookup_url_kwarg = "ticket_number"
