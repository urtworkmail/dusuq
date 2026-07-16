from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes as drf_permission_classes

from .models import Plan, AIUsageRecord, Invoice
from .serializers import (
    PlanSerializer, SubscriptionSerializer, AIUsageRecordSerializer, InvoiceSerializer,
)


@api_view(["GET"])
@drf_permission_classes([permissions.AllowAny])
def public_plan_list(request):
    """Public pricing page data — no auth, no tenant header required."""
    plans = Plan.objects.filter(is_active=True)
    return Response(PlanSerializer(plans, many=True).data)


@api_view(["GET"])
@drf_permission_classes([permissions.IsAuthenticated])
def my_subscription(request):
    tenant = request.tenant
    subscription = getattr(tenant, "subscription", None)
    if subscription is None:
        return Response(
            {"detail": "No subscription on record for this farm — contact support."}, status=404
        )
    return Response(SubscriptionSerializer(subscription).data)


class AIUsageListView(generics.ListAPIView):
    """Recent AI usage records for the current tenant — the billing ledger."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AIUsageRecordSerializer

    def get_queryset(self):
        return AIUsageRecord.objects.filter(tenant=self.request.tenant)


class InvoiceListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        return Invoice.objects.filter(tenant=self.request.tenant)
