from datetime import date, timedelta
from django.db.models import Count, Q
from rest_framework import generics, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
import django_filters

from apps.animals.models import Animal, AnimalStatus
from .models import Insemination, PregnancyTest, DryOff, Calving, Abortion, PregnancyResult
from .serializers import (
    InseminationSerializer, PregnancyTestSerializer,
    DryOffSerializer, CalvingSerializer, AbortionSerializer,
)


# ─── Insemination ─────────────────────────────────────────────────────────────

class InseminationFilter(django_filters.FilterSet):
    date_after = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_before = django_filters.DateFilter(field_name="date", lookup_expr="lte")
    insemination_type = django_filters.CharFilter()
    technician = django_filters.NumberFilter(field_name="technician__id")

    class Meta:
        model = Insemination
        fields = ["animal", "insemination_type", "technician"]


class InseminationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = InseminationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = InseminationFilter
    search_fields = ["animal__tag_number", "animal__name", "semen_batch", "bull_tag"]
    ordering = ["-date"]

    def get_queryset(self):
        return Insemination.objects.filter(
            tenant=self.request.tenant
        ).select_related("animal", "technician")

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class InseminationDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = InseminationSerializer

    def get_queryset(self):
        return Insemination.objects.filter(tenant=self.request.tenant)


# ─── Pregnancy Test ───────────────────────────────────────────────────────────

class PregnancyTestListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PregnancyTestSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["animal", "result", "method"]
    ordering = ["-date"]

    def get_queryset(self):
        return PregnancyTest.objects.filter(
            tenant=self.request.tenant
        ).select_related("animal", "conducted_by")

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class PregnancyTestDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PregnancyTestSerializer

    def get_queryset(self):
        return PregnancyTest.objects.filter(tenant=self.request.tenant)


# ─── Dry Off ──────────────────────────────────────────────────────────────────

class DryOffListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DryOffSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["animal"]
    ordering = ["-dry_off_date"]

    def get_queryset(self):
        return DryOff.objects.filter(
            tenant=self.request.tenant
        ).select_related("animal")

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class DryOffDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DryOffSerializer

    def get_queryset(self):
        return DryOff.objects.filter(tenant=self.request.tenant)


# ─── Calving ──────────────────────────────────────────────────────────────────

class CalvingListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CalvingSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["dam", "calving_type", "calf_sex"]
    search_fields = ["dam__tag_number", "calf_tag"]
    ordering = ["-calving_date"]

    def get_queryset(self):
        return Calving.objects.filter(
            tenant=self.request.tenant
        ).select_related("dam")

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class CalvingDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CalvingSerializer

    def get_queryset(self):
        return Calving.objects.filter(tenant=self.request.tenant)


# ─── Abortion ─────────────────────────────────────────────────────────────────

class AbortionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AbortionSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["animal"]
    ordering = ["-date"]

    def get_queryset(self):
        return Abortion.objects.filter(
            tenant=self.request.tenant
        ).select_related("animal")

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class AbortionDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AbortionSerializer

    def get_queryset(self):
        return Abortion.objects.filter(tenant=self.request.tenant)


# ─── Dashboard & Reports ──────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def reproduction_dashboard(request):
    tenant = request.tenant
    today = date.today()

    animals = Animal.objects.filter(tenant=tenant, is_active=True)

    # Herd position
    herd = {
        "total": animals.count(),
        "milking": animals.filter(status__in=["open", "inseminated", "pregnant"]).count(),
        "dry": animals.filter(status="dry").count(),
        "pregnant": animals.filter(status="pregnant").count(),
        "heifer": animals.filter(status="heifer").count(),
        "sick": animals.filter(status="sick").count(),
        "open": animals.filter(status="open").count(),
    }

    # Upcoming calvings (next 30 days)
    upcoming_calvings = []
    for ins in Insemination.objects.filter(
        tenant=tenant,
        animal__status="pregnant",
    ).select_related("animal"):
        ecd = ins.expected_calving_date
        if today <= ecd <= today + timedelta(days=30):
            upcoming_calvings.append({
                "animal_tag": ins.animal.tag_number,
                "animal_name": ins.animal.display_name,
                "expected_calving_date": ecd,
                "days_remaining": (ecd - today).days,
            })
    upcoming_calvings.sort(key=lambda x: x["days_remaining"])

    # Conception rate (last 90 days)
    inseminations_90 = Insemination.objects.filter(
        tenant=tenant,
        date__gte=today - timedelta(days=90),
    ).count()
    confirmed_pregnancies_90 = PregnancyTest.objects.filter(
        tenant=tenant,
        date__gte=today - timedelta(days=90),
        result=PregnancyResult.POSITIVE,
    ).count()
    conception_rate = (
        round(confirmed_pregnancies_90 / inseminations_90 * 100, 1)
        if inseminations_90 > 0
        else 0
    )

    # Monthly conception rate trend (last 6 months)
    monthly_trend = []
    for i in range(5, -1, -1):
        month_start = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1, day=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1, day=1)

        ins_count = Insemination.objects.filter(
            tenant=tenant, date__gte=month_start, date__lt=month_end
        ).count()
        preg_count = PregnancyTest.objects.filter(
            tenant=tenant,
            date__gte=month_start,
            date__lt=month_end,
            result=PregnancyResult.POSITIVE,
        ).count()
        rate = round(preg_count / ins_count * 100, 1) if ins_count > 0 else 0
        monthly_trend.append({
            "month": month_start.strftime("%b %Y"),
            "inseminations": ins_count,
            "pregnancies": preg_count,
            "conception_rate": rate,
        })

    # Recent activities (last 10 events)
    recent = []
    for ins in Insemination.objects.filter(tenant=tenant).select_related("animal").order_by("-date")[:5]:
        recent.append({
            "type": "insemination",
            "animal": ins.animal.display_name,
            "date": ins.date,
            "detail": ins.get_insemination_type_display(),
        })
    for calv in Calving.objects.filter(tenant=tenant).select_related("dam").order_by("-calving_date")[:5]:
        recent.append({
            "type": "calving",
            "animal": calv.dam.display_name,
            "date": calv.calving_date,
            "detail": calv.get_calving_type_display(),
        })
    recent.sort(key=lambda x: x["date"], reverse=True)

    return Response({
        "herd_position": herd,
        "upcoming_calvings": upcoming_calvings[:10],
        "conception_rate_90_days": conception_rate,
        "monthly_trend": monthly_trend,
        "recent_activity": recent[:10],
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def technician_performance(request):
    """AI technician performance report."""
    from django.db.models import Count
    tenant = request.tenant
    date_from = request.query_params.get("date_from")
    date_to = request.query_params.get("date_to")

    qs = Insemination.objects.filter(
        tenant=tenant,
        insemination_type="ai",
        technician__isnull=False,
    )
    if date_from:
        qs = qs.filter(date__gte=date_from)
    if date_to:
        qs = qs.filter(date__lte=date_to)

    rows = []
    by_tech = qs.values("technician__id", "technician__first_name", "technician__last_name").annotate(
        total_inseminations=Count("id")
    )
    for row in by_tech:
        tech_id = row["technician__id"]
        total = row["total_inseminations"]
        preg = PregnancyTest.objects.filter(
            tenant=tenant,
            result=PregnancyResult.POSITIVE,
            insemination__technician_id=tech_id,
        ).count()
        rate = round(preg / total * 100, 1) if total > 0 else 0
        rows.append({
            "technician": f"{row['technician__first_name']} {row['technician__last_name']}",
            "total_inseminations": total,
            "confirmed_pregnancies": preg,
            "conception_rate": rate,
        })

    rows.sort(key=lambda x: x["conception_rate"], reverse=True)
    return Response(rows)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def expected_tasks(request):
    """Upcoming reproduction tasks for the next N days."""
    tenant = request.tenant
    today = date.today()
    days = int(request.query_params.get("days", 14))
    horizon = today + timedelta(days=days)

    tasks = []

    # Upcoming calvings
    for ins in Insemination.objects.filter(
        tenant=tenant, animal__status="pregnant"
    ).select_related("animal"):
        ecd = ins.expected_calving_date
        if today <= ecd <= horizon:
            tasks.append({
                "task_type": "calving_due",
                "label": "Expected Calving",
                "animal_tag": ins.animal.tag_number,
                "animal_name": ins.animal.display_name,
                "due_date": ecd,
                "days_until": (ecd - today).days,
            })

    # Animals inseminated ~28–35 days ago — pregnancy check due
    preg_check_start = today - timedelta(days=35)
    preg_check_end = today - timedelta(days=28)
    for ins in Insemination.objects.filter(
        tenant=tenant,
        animal__status="inseminated",
        date__gte=preg_check_start,
        date__lte=preg_check_end,
    ).select_related("animal"):
        tasks.append({
            "task_type": "preg_check_due",
            "label": "Pregnancy Check Due",
            "animal_tag": ins.animal.tag_number,
            "animal_name": ins.animal.display_name,
            "due_date": ins.date + timedelta(days=28),
            "days_until": 0,
        })

    tasks.sort(key=lambda x: x["due_date"])
    return Response(tasks)
