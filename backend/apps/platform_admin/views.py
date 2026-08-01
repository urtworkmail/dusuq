from datetime import timedelta, date
from django.db import connection
from django.db.models import Sum, Count
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import AuditLog
from .permissions import IsPlatformAdmin
from .serializers import (
    AuditLogSerializer, FarmListSerializer, FarmDetailSerializer, FarmToggleActiveSerializer,
    PlatformUserSerializer, PlanAdminSerializer, SubscriptionAdminSerializer,
    InvoiceAdminSerializer, AIUsageAdminSerializer, SupportTicketAdminSerializer,
)

ONLINE_THRESHOLD_MINUTES = 5


@api_view(["GET"])
@permission_classes([IsPlatformAdmin])
def dashboard_metrics(request):
    """
    Every metric the SaaS owner dashboard spec asked for, computed live.
    Cross-tenant by design — see apps/tenants/middleware.py EXEMPT_PATHS for
    why this doesn't go through TenantMiddleware's normal tenant scoping.
    """
    from django.contrib.auth import get_user_model
    from apps.tenants.models import Tenant
    from apps.animals.models import Animal
    from apps.milk.models import MilkRecord
    from apps.subscriptions.models import Subscription, Invoice, AIUsageRecord
    from apps.tickets.models import SupportTicket

    User = get_user_model()
    now = timezone.now()
    today = now.date()
    week_start = today - timedelta(days=7)
    month_start = today - timedelta(days=30)

    total_signups = User.objects.count()
    total_farms = Tenant.objects.count()
    new_farms_today = Tenant.objects.filter(created_at__date=today).count()
    new_farms_week = Tenant.objects.filter(created_at__date__gte=week_start).count()
    new_farms_month = Tenant.objects.filter(created_at__date__gte=month_start).count()

    dau = User.objects.filter(last_login__gte=now - timedelta(days=1)).count()
    wau = User.objects.filter(last_login__gte=now - timedelta(days=7)).count()
    mau = User.objects.filter(last_login__gte=now - timedelta(days=30)).count()
    currently_online = User.objects.filter(
        last_activity__gte=now - timedelta(minutes=ONLINE_THRESHOLD_MINUTES)
    ).count()

    status_counts = dict(
        Subscription.objects.values_list("status").annotate(c=Count("id")).order_by()
    )
    paid_count = status_counts.get("active", 0) + status_counts.get("past_due", 0)
    trial_count = status_counts.get("trialing", 0)
    expired_count = status_counts.get("expired", 0) + status_counts.get("canceled", 0)

    mrr = float(
        Subscription.objects.filter(status="active", plan__price_monthly_pkr__isnull=False)
        .aggregate(t=Sum("plan__price_monthly_pkr"))["t"] or 0
    )
    arr = round(mrr * 12, 2)

    farms_by_province = list(
        Tenant.objects.exclude(province="").values("province").annotate(count=Count("id")).order_by("-count")
    )
    farms_by_district = list(
        Tenant.objects.exclude(district="").values("district").annotate(count=Count("id")).order_by("-count")
    )
    unassigned_province_count = Tenant.objects.filter(province="").count()

    total_animals = Animal.objects.filter(is_active=True).count()
    milk_today = float(
        MilkRecord.objects.filter(date=today).aggregate(t=Sum("litres"))["t"] or 0
    )
    ai_usage_total = AIUsageRecord.objects.count()
    ai_usage_last_30d = AIUsageRecord.objects.filter(created_at__gte=now - timedelta(days=30)).count()

    ticket_status_counts = dict(
        SupportTicket.objects.values_list("status").annotate(c=Count("id")).order_by()
    )
    invoice_status_counts = dict(
        Invoice.objects.values_list("status").annotate(c=Count("id")).order_by()
    )

    db_ok = True
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception:
        db_ok = False

    redis_ok = True
    try:
        import redis
        from django.conf import settings as dj_settings
        r = redis.from_url(dj_settings.CELERY_BROKER_URL, socket_connect_timeout=2)
        r.ping()
    except Exception:
        redis_ok = False

    return Response({
        "generated_at": now.isoformat(),
        "users": {
            "total_signups": total_signups,
            "dau": dau,
            "wau": wau,
            "mau": mau,
            "currently_online": currently_online,
        },
        "farms": {
            "total_farms": total_farms,
            "new_today": new_farms_today,
            "new_this_week": new_farms_week,
            "new_this_month": new_farms_month,
            "by_province": farms_by_province,
            "by_district": farms_by_district,
            "unassigned_province_count": unassigned_province_count,
        },
        "subscriptions": {
            "paid": paid_count,
            "trial": trial_count,
            "expired": expired_count,
            "mrr_pkr": mrr,
            "arr_pkr": arr,
        },
        "farm_activity": {
            "total_animals": total_animals,
            "milk_production_today_litres": milk_today,
            "ai_usage_total_calls": ai_usage_total,
            "ai_usage_last_30d_calls": ai_usage_last_30d,
        },
        "support_tickets": ticket_status_counts,
        "invoices": invoice_status_counts,
        "server_health": {
            "database": "ok" if db_ok else "down",
            "redis": "ok" if redis_ok else "down",
        },
    })


@api_view(["GET"])
@permission_classes([IsPlatformAdmin])
def live_snapshot(request):
    """Polled every ~10s by the frontend — see the platform-admin polling-vs-WebSockets decision note."""
    from django.contrib.auth import get_user_model
    from apps.tenants.models import Tenant
    from apps.subscriptions.models import Invoice

    User = get_user_model()
    now = timezone.now()
    today = now.date()

    return Response({
        "timestamp": now.isoformat(),
        "online_now": User.objects.filter(
            last_activity__gte=now - timedelta(minutes=ONLINE_THRESHOLD_MINUTES)
        ).count(),
        "new_signups_today": User.objects.filter(date_joined__date=today).count(),
        "new_farms_today": Tenant.objects.filter(created_at__date=today).count(),
        "payments_today": Invoice.objects.filter(status="paid", paid_at__date=today).count(),
        "payments_amount_today_pkr": float(
            Invoice.objects.filter(status="paid", paid_at__date=today)
            .aggregate(t=Sum("plan_amount_pkr"))["t"] or 0
        ),
    })


@api_view(["GET"])
@permission_classes([IsPlatformAdmin])
def analytics_trends(request):
    """
    Time-series data behind the "analysis system" — daily sign-ups and new
    farms over a trailing window (default 30 days, capped at 365), plus a
    6-month MRR trend and the current subscription-status distribution
    (a pie-chart-friendly snapshot, not a trend — status history isn't
    tracked over time anywhere in the data model).
    """
    from django.contrib.auth import get_user_model
    from apps.tenants.models import Tenant
    from apps.subscriptions.models import Subscription

    User = get_user_model()
    try:
        days = min(int(request.query_params.get("days", 30)), 365)
    except (TypeError, ValueError):
        days = 30
    days = max(days, 1)
    today = timezone.now().date()
    start = today - timedelta(days=days - 1)

    signups_by_day = list(
        User.objects.filter(date_joined__date__gte=start)
        .values_list("date_joined__date")
        .annotate(c=Count("id"))
        .order_by("date_joined__date")
    )
    farms_by_day = list(
        Tenant.objects.filter(created_at__date__gte=start)
        .values_list("created_at__date")
        .annotate(c=Count("id"))
        .order_by("created_at__date")
    )
    signups_map = {str(d): c for d, c in signups_by_day}
    farms_map = {str(d): c for d, c in farms_by_day}

    daily_series = []
    cumulative_farms = Tenant.objects.filter(created_at__date__lt=start).count()
    for i in range(days):
        d = start + timedelta(days=i)
        key = str(d)
        new_farms = farms_map.get(key, 0)
        cumulative_farms += new_farms
        daily_series.append({
            "date": key,
            "new_signups": signups_map.get(key, 0),
            "new_farms": new_farms,
            "cumulative_farms": cumulative_farms,
        })

    # MRR trend — approximated month-by-month using each subscription's
    # created_at, since billing-period history isn't tracked separately.
    mrr_trend = []
    for i in range(5, -1, -1):
        month_end = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        if month_end.month == 12:
            next_month = month_end.replace(year=month_end.year + 1, month=1)
        else:
            next_month = month_end.replace(month=month_end.month + 1)
        mrr = float(
            Subscription.objects.filter(
                status="active", created_at__date__lt=next_month, plan__price_monthly_pkr__isnull=False
            ).aggregate(t=Sum("plan__price_monthly_pkr"))["t"] or 0
        )
        mrr_trend.append({"month": month_end.strftime("%b %Y"), "mrr_pkr": mrr})

    status_distribution = list(
        Subscription.objects.values("status").annotate(count=Count("id")).order_by("-count")
    )

    return Response({
        "daily_series": daily_series,
        "mrr_trend": mrr_trend,
        "subscription_status_distribution": status_distribution,
    })


class FarmListView(generics.ListAPIView):
    permission_classes = [IsPlatformAdmin]
    serializer_class = FarmListSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active", "province", "district"]
    search_fields = ["name", "slug", "owner_email", "city"]
    ordering_fields = ["name", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        from apps.tenants.models import Tenant
        return Tenant.objects.select_related("subscription", "subscription__plan").all()


class FarmDetailView(generics.RetrieveAPIView):
    permission_classes = [IsPlatformAdmin]
    serializer_class = FarmDetailSerializer

    def get_queryset(self):
        from apps.tenants.models import Tenant
        return Tenant.objects.select_related("subscription", "subscription__plan").all()


@api_view(["POST"])
@permission_classes([IsPlatformAdmin])
def farm_toggle_active(request, pk):
    """Suspend/reactivate a farm platform-wide (e.g. for non-payment or ToS reasons)."""
    from apps.tenants.models import Tenant
    try:
        tenant = Tenant.objects.get(pk=pk)
    except Tenant.DoesNotExist:
        return Response({"detail": "Farm not found."}, status=404)

    serializer = FarmToggleActiveSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    tenant.is_active = serializer.validated_data["is_active"]
    tenant.save(update_fields=["is_active"])
    return Response(FarmDetailSerializer(tenant).data)


class PlatformUserListView(generics.ListAPIView):
    permission_classes = [IsPlatformAdmin]
    serializer_class = PlatformUserSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active", "is_superuser", "role", "tenant"]
    search_fields = ["email", "first_name", "last_name"]
    ordering_fields = ["date_joined", "last_login", "last_activity"]
    ordering = ["-date_joined"]

    def get_queryset(self):
        from django.contrib.auth import get_user_model
        return get_user_model().objects.select_related("tenant").all()


class PlanListCreateView(generics.ListCreateAPIView):
    """
    Unpaginated on purpose — a handful of pricing tiers, meant to be seen and
    edited all at once, not paged through like Farms/Users/Transactions.
    """
    permission_classes = [IsPlatformAdmin]
    serializer_class = PlanAdminSerializer
    pagination_class = None

    def get_queryset(self):
        from apps.subscriptions.models import Plan
        return Plan.objects.all()


class PlanDetailView(generics.RetrieveUpdateAPIView):
    """
    No delete — Plan has on_delete=PROTECT on Subscription, so removing a
    plan that's actually in use would 500 instead of failing cleanly.
    Deactivating via `is_active=False` (hides it from new sign-ups without
    touching existing subscribers) is the correct way to retire a plan.
    """
    permission_classes = [IsPlatformAdmin]
    serializer_class = PlanAdminSerializer

    def get_queryset(self):
        from apps.subscriptions.models import Plan
        return Plan.objects.all()


class SubscriptionAdminListView(generics.ListAPIView):
    permission_classes = [IsPlatformAdmin]
    serializer_class = SubscriptionAdminSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "gateway", "plan"]
    search_fields = ["tenant__name", "tenant__owner_email"]
    ordering_fields = ["created_at", "current_period_end"]
    ordering = ["-created_at"]

    def get_queryset(self):
        from apps.subscriptions.models import Subscription
        return Subscription.objects.select_related("tenant", "plan").all()


class SubscriptionAdminDetailView(generics.RetrieveUpdateAPIView):
    """
    Manual subscription management — e.g. mark a manually-invoiced tenant as
    active, or extend a period. Status transitions here fire the same
    purchased/renewed audit signal as any other Subscription save (see
    apps/platform_admin/signals.py) — no special-casing needed.
    """
    permission_classes = [IsPlatformAdmin]
    serializer_class = SubscriptionAdminSerializer

    def get_queryset(self):
        from apps.subscriptions.models import Subscription
        return Subscription.objects.select_related("tenant", "plan").all()


class InvoiceAdminListView(generics.ListAPIView):
    permission_classes = [IsPlatformAdmin]
    serializer_class = InvoiceAdminSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "gateway"]
    search_fields = ["tenant__name", "gateway_invoice_id"]
    ordering_fields = ["created_at", "period_start"]
    ordering = ["-period_start"]

    def get_queryset(self):
        from apps.subscriptions.models import Invoice
        return Invoice.objects.select_related("tenant").all()


class InvoiceAdminDetailView(generics.RetrieveUpdateAPIView):
    """
    The manual-invoicing "mark as paid" workflow: a human verifies a bank
    receipt and flips status here. Auto-stamps/clears paid_at to match the
    status, since the frontend only ever sends `status`.
    """
    permission_classes = [IsPlatformAdmin]
    serializer_class = InvoiceAdminSerializer

    def get_queryset(self):
        from apps.subscriptions.models import Invoice
        return Invoice.objects.select_related("tenant").all()

    def perform_update(self, serializer):
        from apps.subscriptions.models import InvoiceStatus
        new_status = serializer.validated_data.get("status")
        if new_status == InvoiceStatus.PAID and serializer.instance.status != InvoiceStatus.PAID:
            serializer.save(paid_at=timezone.now())
        elif new_status is not None and new_status != InvoiceStatus.PAID:
            serializer.save(paid_at=None)
        else:
            serializer.save()


class AIUsageAdminListView(generics.ListAPIView):
    permission_classes = [IsPlatformAdmin]
    serializer_class = AIUsageAdminSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["kind", "tenant"]
    search_fields = ["tenant__name", "user__email"]
    ordering = ["-created_at"]

    def get_queryset(self):
        from apps.subscriptions.models import AIUsageRecord
        return AIUsageRecord.objects.select_related("tenant", "user").all()


class SupportTicketAdminListView(generics.ListAPIView):
    permission_classes = [IsPlatformAdmin]
    serializer_class = SupportTicketAdminSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "priority"]
    search_fields = ["ticket_number", "organization_name", "account_username", "email", "subject"]
    ordering = ["-created_at"]

    def get_queryset(self):
        from apps.tickets.models import SupportTicket
        return SupportTicket.objects.all()


class SupportTicketAdminDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsPlatformAdmin]
    serializer_class = SupportTicketAdminSerializer

    def get_queryset(self):
        from apps.tickets.models import SupportTicket
        return SupportTicket.objects.all()


class AuditLogListView(generics.ListAPIView):
    permission_classes = [IsPlatformAdmin]
    serializer_class = AuditLogSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["action", "tenant"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return AuditLog.objects.select_related("tenant", "user").all()
