from datetime import timedelta
from django.db import connection
from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import AuditLog
from .permissions import IsPlatformAdmin
from .serializers import AuditLogSerializer

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

    # ── Users & farms ──────────────────────────────────────────────────
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

    # ── Subscriptions & revenue ─────────────────────────────────────────
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

    # ── Geography ─────────────────────────────────────────────────────
    farms_by_province = list(
        Tenant.objects.exclude(province="").values("province").annotate(count=Count("id")).order_by("-count")
    )
    farms_by_district = list(
        Tenant.objects.exclude(district="").values("district").annotate(count=Count("id")).order_by("-count")
    )
    unassigned_province_count = Tenant.objects.filter(province="").count()

    # ── Farm activity ─────────────────────────────────────────────────
    total_animals = Animal.objects.filter(is_active=True).count()
    milk_today = float(
        MilkRecord.objects.filter(date=today).aggregate(t=Sum("litres"))["t"] or 0
    )
    ai_usage_total = AIUsageRecord.objects.count()
    ai_usage_last_30d = AIUsageRecord.objects.filter(created_at__gte=now - timedelta(days=30)).count()

    # ── Support & payments ──────────────────────────────────────────────
    ticket_status_counts = dict(
        SupportTicket.objects.values_list("status").annotate(c=Count("id")).order_by()
    )
    invoice_status_counts = dict(
        Invoice.objects.values_list("status").annotate(c=Count("id")).order_by()
    )

    # ── Server health ───────────────────────────────────────────────────
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
    """
    Polled every ~10s by the frontend for a "live" feel — see the dedicated
    real-time-dashboard decision note: polling instead of WebSockets/Django
    Channels, since it gets the same practical result here without adding a
    whole new push-infrastructure layer to the deployment.
    """
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


class AuditLogListView(generics.ListAPIView):
    permission_classes = [IsPlatformAdmin]
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        qs = AuditLog.objects.select_related("tenant", "user").all()
        action = self.request.query_params.get("action")
        tenant_id = self.request.query_params.get("tenant")
        if action:
            qs = qs.filter(action=action)
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs
