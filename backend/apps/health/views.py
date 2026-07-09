from datetime import date, timedelta
from django.db.models import Count, Sum
from rest_framework import generics, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Treatment, Vaccination, Deworming, DiseaseEvent
from .serializers import TreatmentSerializer, VaccinationSerializer, DewormingSerializer, DiseaseEventSerializer


class TreatmentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TreatmentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["animal", "outcome"]
    search_fields = ["animal__tag_number", "diagnosis", "drug"]
    ordering = ["-date"]

    def get_queryset(self):
        qs = Treatment.objects.filter(tenant=self.request.tenant).select_related("animal", "administered_by")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class TreatmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TreatmentSerializer

    def get_queryset(self):
        return Treatment.objects.filter(tenant=self.request.tenant)


class VaccinationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VaccinationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["animal", "shed", "is_group_vaccination"]
    search_fields = ["vaccine_name", "batch_number", "animal__tag_number"]
    ordering = ["-date"]

    def get_queryset(self):
        qs = Vaccination.objects.filter(tenant=self.request.tenant).select_related("animal", "shed")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class VaccinationDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VaccinationSerializer

    def get_queryset(self):
        return Vaccination.objects.filter(tenant=self.request.tenant)


class DewormingListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DewormingSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["animal", "shed", "is_group_deworming"]
    search_fields = ["product", "animal__tag_number"]
    ordering = ["-date"]

    def get_queryset(self):
        qs = Deworming.objects.filter(tenant=self.request.tenant).select_related("animal", "shed")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class DewormingDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DewormingSerializer

    def get_queryset(self):
        return Deworming.objects.filter(tenant=self.request.tenant)


class DiseaseEventListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DiseaseEventSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["animal", "severity"]
    search_fields = ["animal__tag_number", "disease_name"]
    ordering = ["-date"]

    def get_queryset(self):
        qs = DiseaseEvent.objects.filter(tenant=self.request.tenant).select_related("animal")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class DiseaseEventDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DiseaseEventSerializer

    def get_queryset(self):
        return DiseaseEvent.objects.filter(tenant=self.request.tenant)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def health_dashboard(request):
    tenant = request.tenant
    today = date.today()

    # Active treatments
    active_treatments = Treatment.objects.filter(tenant=tenant, outcome="ongoing").count()

    # Vaccination due in next 14 days
    vacc_due = Vaccination.objects.filter(
        tenant=tenant,
        next_due_date__gte=today,
        next_due_date__lte=today + timedelta(days=14),
    ).count()

    # Deworming due in next 14 days
    deworm_due = Deworming.objects.filter(
        tenant=tenant,
        next_due_date__gte=today,
        next_due_date__lte=today + timedelta(days=14),
    ).count()

    # Disease trend (last 6 months)
    disease_trend = []
    for i in range(5, -1, -1):
        month_start = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1, day=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1, day=1)
        count = DiseaseEvent.objects.filter(
            tenant=tenant, date__gte=month_start, date__lt=month_end
        ).count()
        disease_trend.append({"month": month_start.strftime("%b %Y"), "count": count})

    # Top diseases
    top_diseases = (
        DiseaseEvent.objects.filter(tenant=tenant)
        .values("disease_name")
        .annotate(count=Count("id"))
        .order_by("-count")[:10]
    )

    # Treatment cost (current month)
    month_start = today.replace(day=1)
    treatment_cost = Treatment.objects.filter(
        tenant=tenant, date__gte=month_start
    ).aggregate(total=Sum("cost"))["total"] or 0

    # Follow-up treatments due
    follow_up_due = Treatment.objects.filter(
        tenant=tenant,
        follow_up_date__gte=today,
        follow_up_date__lte=today + timedelta(days=7),
        outcome="ongoing",
    ).select_related("animal").values(
        "animal__tag_number", "animal__name", "follow_up_date", "diagnosis"
    )

    return Response({
        "active_treatments": active_treatments,
        "vaccination_due_14_days": vacc_due,
        "deworming_due_14_days": deworm_due,
        "disease_trend": disease_trend,
        "top_diseases": list(top_diseases),
        "treatment_cost_this_month": float(treatment_cost),
        "follow_up_due": list(follow_up_due),
    })
