from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.subscriptions.permissions import HasAIAccess
from apps.subscriptions.services import record_ai_usage
from . import context as ctx
from . import gemini_client
from .models import VetAssistQuery, VetAssistReport, VetAssistForecast, EntityType
from .serializers import (
    VetAssistQuerySerializer, VetAssistQueryRequestSerializer,
    VetAssistReportSerializer, VetAssistReportRequestSerializer,
    VetAssistForecastSerializer, VetAssistForecastRequestSerializer,
)

ENTITY_LABEL = {
    EntityType.ANIMAL: "animal {id}",
    EntityType.SHED: "shed {id}",
    EntityType.GROUP: "animal group {id}",
    EntityType.FARM: "the whole farm",
}


def _sources_for(entity_type):
    if entity_type == EntityType.ANIMAL:
        return ["animals", "milk", "health", "reproduction"]
    if entity_type in (EntityType.SHED, EntityType.GROUP):
        return ["animals", "milk", "health"]
    return ["animals", "milk", "health", "reproduction", "inventory", "accounts"]


@api_view(["POST"])
@permission_classes([IsAuthenticated, HasAIAccess])
def query(request):
    """Ask VetAssist a natural-language question, scoped to the requesting tenant."""
    req = VetAssistQueryRequestSerializer(data=request.data)
    req.is_valid(raise_exception=True)
    data = req.validated_data

    entity_type = data.get("entity_type")
    entity_id = data.get("entity_id") or None
    farm_context = ctx.resolve_context(
        request.tenant, question=data["question"], entity_type=entity_type, entity_id=entity_id
    )

    record = VetAssistQuery.objects.create(
        tenant=request.tenant,
        asked_by=request.user,
        question=data["question"],
        sources=_sources_for(entity_type or EntityType.FARM),
    )

    try:
        answer, usage = gemini_client.ask(data["question"], farm_context, allow_research=True)
    except RuntimeError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    record.answer = answer
    record.used_external_research = True
    record.save(update_fields=["answer", "used_external_research"])
    record_ai_usage(
        request.tenant, request.user, "query",
        usage["model"], usage["input_tokens"], usage["output_tokens"],
    )

    return Response(VetAssistQuerySerializer(record).data)


class ReportListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, HasAIAccess]

    def get_queryset(self):
        return VetAssistReport.objects.filter(tenant=self.request.tenant)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return VetAssistReportRequestSerializer
        return VetAssistReportSerializer

    def create(self, request, *args, **kwargs):
        req = VetAssistReportRequestSerializer(data=request.data)
        req.is_valid(raise_exception=True)
        data = req.validated_data
        entity_type = data["entity_type"]
        entity_id = data.get("entity_id") or None

        farm_context = ctx.resolve_context(
            request.tenant, entity_type=entity_type, entity_id=entity_id
        )
        if entity_type == EntityType.ANIMAL and farm_context is None:
            return Response(
                {"detail": f"No animal found with tag number '{entity_id}'."},
                status=status.HTTP_404_NOT_FOUND,
            )

        report = VetAssistReport.objects.create(
            tenant=request.tenant,
            requested_by=request.user,
            entity_type=entity_type,
            entity_id=entity_id or "",
            include_research=data["include_research"],
        )

        label = ENTITY_LABEL[entity_type].format(id=entity_id or "")
        try:
            content, usage = gemini_client.generate_report(farm_context, label, data["include_research"])
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        report.content = content
        report.used_external_research = data["include_research"]
        report.save(update_fields=["content", "used_external_research"])
        record_ai_usage(
            request.tenant, request.user, "report",
            usage["model"], usage["input_tokens"], usage["output_tokens"],
        )

        return Response(VetAssistReportSerializer(report).data, status=status.HTTP_201_CREATED)


class ReportDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VetAssistReportSerializer

    def get_queryset(self):
        return VetAssistReport.objects.filter(tenant=self.request.tenant)


@api_view(["POST"])
@permission_classes([IsAuthenticated, HasAIAccess])
def forecast(request):
    """Generate a forecast / historical analysis for a metric and scope."""
    req = VetAssistForecastRequestSerializer(data=request.data)
    req.is_valid(raise_exception=True)
    data = req.validated_data

    scope = data["scope"]
    scope_id = data.get("scope_id") or None
    farm_context = ctx.resolve_context(request.tenant, entity_type=scope, entity_id=scope_id)

    record = VetAssistForecast.objects.create(
        tenant=request.tenant,
        requested_by=request.user,
        metric=data["metric"],
        scope=scope,
        scope_id=scope_id or "",
        horizon_days=data["horizon_days"],
    )

    scope_label = ENTITY_LABEL[scope].format(id=scope_id or "")
    try:
        content, usage = gemini_client.generate_forecast(
            farm_context, data["metric"], scope_label, data["horizon_days"]
        )
    except RuntimeError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    record.content = content
    record.save(update_fields=["content"])
    record_ai_usage(
        request.tenant, request.user, "forecast",
        usage["model"], usage["input_tokens"], usage["output_tokens"],
    )

    return Response(VetAssistForecastSerializer(record).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def history(request):
    """Recent VetAssist activity for the current tenant — queries, reports, forecasts."""
    queries = VetAssistQuerySerializer(
        VetAssistQuery.objects.filter(tenant=request.tenant)[:20], many=True
    ).data
    reports = VetAssistReportSerializer(
        VetAssistReport.objects.filter(tenant=request.tenant)[:20], many=True
    ).data
    forecasts = VetAssistForecastSerializer(
        VetAssistForecast.objects.filter(tenant=request.tenant)[:20], many=True
    ).data
    return Response({"queries": queries, "reports": reports, "forecasts": forecasts})
