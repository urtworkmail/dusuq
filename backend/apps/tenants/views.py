import logging
from django.core.mail import get_connection, EmailMessage
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Tenant, SMTPConfig, Shed, AnimalGroup, Breed
from .serializers import (
    TenantSerializer,
    TenantUpdateSerializer,
    SMTPConfigSerializer,
    ShedSerializer,
    AnimalGroupSerializer,
    BreedSerializer,
)

logger = logging.getLogger(__name__)


class TenantDetailView(generics.RetrieveUpdateAPIView):
    """Get or update the current tenant's profile."""

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return TenantUpdateSerializer
        return TenantSerializer

    def get_object(self):
        return self.request.tenant


class SMTPConfigView(APIView):
    """Manage per-tenant SMTP configuration."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            config = request.tenant.smtp_config
            return Response(SMTPConfigSerializer(config).data)
        except SMTPConfig.DoesNotExist:
            return Response({})

    def put(self, request):
        try:
            config = request.tenant.smtp_config
            serializer = SMTPConfigSerializer(config, data=request.data, partial=True)
        except SMTPConfig.DoesNotExist:
            serializer = SMTPConfigSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)
        config = serializer.save(tenant=request.tenant)
        return Response(SMTPConfigSerializer(config).data)


class SMTPTestView(APIView):
    """Send a test email using the tenant's SMTP config."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            config = request.tenant.smtp_config
        except SMTPConfig.DoesNotExist:
            return Response(
                {"detail": "No SMTP configuration found."}, status=400
            )

        test_to = request.data.get("to_email", request.user.email)

        try:
            connection = get_connection(
                backend="django.core.mail.backends.smtp.EmailBackend",
                host=config.host,
                port=config.port,
                username=config.username,
                password=config.password,
                use_tls=config.use_tls,
                use_ssl=config.use_ssl,
            )
            email = EmailMessage(
                subject="Dusuq ERP SMTP Test",
                body=(
                    f"This is a test email from Dusuq ERP for farm: "
                    f"{request.tenant.name}. Your SMTP configuration is working."
                ),
                from_email=f"{config.from_name} <{config.from_email}>",
                to=[test_to],
                connection=connection,
            )
            email.send(fail_silently=False)

            # Mark as verified
            config.is_verified = True
            config.last_tested_at = timezone.now()
            config.save(update_fields=["is_verified", "last_tested_at"])

            return Response({"detail": f"Test email sent to {test_to}."})

        except Exception as exc:
            logger.error("SMTP test failed for tenant %s: %s", request.tenant.id, exc)
            return Response(
                {"detail": f"SMTP test failed: {str(exc)}"}, status=400
            )


# ─── Shed ─────────────────────────────────────────────────────────────────────

class ShedListCreateView(generics.ListCreateAPIView):
    serializer_class = ShedSerializer

    def get_queryset(self):
        return Shed.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class ShedDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ShedSerializer

    def get_queryset(self):
        return Shed.objects.filter(tenant=self.request.tenant)


# ─── Animal Group ─────────────────────────────────────────────────────────────

class AnimalGroupListCreateView(generics.ListCreateAPIView):
    serializer_class = AnimalGroupSerializer

    def get_queryset(self):
        return AnimalGroup.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class AnimalGroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AnimalGroupSerializer

    def get_queryset(self):
        return AnimalGroup.objects.filter(tenant=self.request.tenant)


# ─── Breed ────────────────────────────────────────────────────────────────────

class BreedListCreateView(generics.ListCreateAPIView):
    serializer_class = BreedSerializer

    def get_queryset(self):
        # Return global breeds + tenant-specific breeds
        from django.db.models import Q
        return Breed.objects.filter(
            Q(is_global=True) | Q(tenant=self.request.tenant)
        )

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, is_global=False)


class BreedDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BreedSerializer

    def get_queryset(self):
        return Breed.objects.filter(tenant=self.request.tenant)
