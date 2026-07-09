from rest_framework import generics, throttling
from rest_framework.permissions import AllowAny

from .models import ContactInquiry
from .serializers import ContactInquirySerializer


class ContactThrottle(throttling.AnonRateThrottle):
    scope = "contact"


class ContactInquiryCreateView(generics.CreateAPIView):
    """Public endpoint — receives submissions from the marketing site contact form."""
    queryset = ContactInquiry.objects.all()
    serializer_class = ContactInquirySerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ContactThrottle]

    def perform_create(self, serializer):
        ip = self.request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or self.request.META.get("REMOTE_ADDR")
        serializer.save(source_ip=ip)
