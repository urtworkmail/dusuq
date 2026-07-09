from datetime import date, timedelta
from django.db.models import Sum, Q
from rest_framework import generics, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import AccountHead, Transaction, Asset, AccountType, TransactionType
from .serializers import AccountHeadSerializer, TransactionSerializer, AssetSerializer


class AccountHeadListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AccountHeadSerializer

    def get_queryset(self):
        return AccountHead.objects.filter(
            tenant=self.request.tenant, parent__isnull=True
        ).prefetch_related("children")

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class AccountHeadDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AccountHeadSerializer

    def get_queryset(self):
        return AccountHead.objects.filter(tenant=self.request.tenant)


class TransactionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TransactionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["transaction_type", "debit_account", "credit_account"]
    search_fields = ["description", "reference", "supplier_name", "invoice_number"]
    ordering = ["-date", "-created_at"]

    def get_queryset(self):
        qs = Transaction.objects.filter(tenant=self.request.tenant).select_related(
            "debit_account", "credit_account", "entered_by"
        )
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class TransactionDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TransactionSerializer

    def get_queryset(self):
        return Transaction.objects.filter(tenant=self.request.tenant)


class AssetListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AssetSerializer

    def get_queryset(self):
        return Asset.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class AssetDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AssetSerializer

    def get_queryset(self):
        return Asset.objects.filter(tenant=self.request.tenant)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def accounts_dashboard(request):
    tenant = request.tenant
    today = date.today()
    month_start = today.replace(day=1)

    # Determine financial year start
    fy_start_month = tenant.financial_year_start_month
    if today.month >= fy_start_month:
        fy_start = today.replace(month=fy_start_month, day=1)
    else:
        fy_start = today.replace(year=today.year - 1, month=fy_start_month, day=1)

    txns = Transaction.objects.filter(tenant=tenant)

    # Income (credit to income accounts)
    income_fy = txns.filter(
        date__gte=fy_start,
        credit_account__account_type=AccountType.INCOME,
    ).aggregate(total=Sum("amount"))["total"] or 0

    # Expense (debit to expense accounts)
    expense_fy = txns.filter(
        date__gte=fy_start,
        debit_account__account_type=AccountType.EXPENSE,
    ).aggregate(total=Sum("amount"))["total"] or 0

    profit_fy = float(income_fy) - float(expense_fy)

    # Monthly P&L trend (last 6 months)
    monthly_pl = []
    for i in range(5, -1, -1):
        ms = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        if ms.month == 12:
            me = ms.replace(year=ms.year + 1, month=1, day=1)
        else:
            me = ms.replace(month=ms.month + 1, day=1)
        inc = txns.filter(
            date__gte=ms, date__lt=me,
            credit_account__account_type=AccountType.INCOME,
        ).aggregate(t=Sum("amount"))["t"] or 0
        exp = txns.filter(
            date__gte=ms, date__lt=me,
            debit_account__account_type=AccountType.EXPENSE,
        ).aggregate(t=Sum("amount"))["t"] or 0
        monthly_pl.append({
            "month": ms.strftime("%b %Y"),
            "income": float(inc),
            "expense": float(exp),
            "profit": float(inc) - float(exp),
        })

    # Total asset value
    total_asset_value = sum(a.current_value() for a in Asset.objects.filter(tenant=tenant, is_active=True))

    return Response({
        "income_fy": float(income_fy),
        "expense_fy": float(expense_fy),
        "profit_fy": profit_fy,
        "total_asset_value": round(total_asset_value, 2),
        "monthly_pl": monthly_pl,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def trial_balance(request):
    """Trial balance for a date range."""
    tenant = request.tenant
    date_to = request.query_params.get("date_to", str(date.today()))

    accounts = AccountHead.objects.filter(tenant=tenant, is_active=True)
    rows = []
    for acc in accounts:
        debits = Transaction.objects.filter(
            tenant=tenant, debit_account=acc, date__lte=date_to
        ).aggregate(t=Sum("amount"))["t"] or 0
        credits = Transaction.objects.filter(
            tenant=tenant, credit_account=acc, date__lte=date_to
        ).aggregate(t=Sum("amount"))["t"] or 0
        if debits or credits:
            rows.append({
                "account": acc.name,
                "account_type": acc.account_type,
                "debit": float(debits),
                "credit": float(credits),
                "balance": float(debits) - float(credits),
            })

    return Response(rows)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profit_and_loss(request):
    tenant = request.tenant
    date_from = request.query_params.get("date_from")
    date_to = request.query_params.get("date_to", str(date.today()))

    def get_total(account_type, is_debit):
        qs = Transaction.objects.filter(tenant=tenant)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        qs = qs.filter(date__lte=date_to)
        if is_debit:
            qs = qs.filter(debit_account__account_type=account_type)
        else:
            qs = qs.filter(credit_account__account_type=account_type)
        return float(qs.aggregate(t=Sum("amount"))["t"] or 0)

    income = get_total(AccountType.INCOME, False)
    expenses = get_total(AccountType.EXPENSE, True)

    # Income breakdown by account
    income_breakdown = list(
        Transaction.objects.filter(
            tenant=tenant,
            credit_account__account_type=AccountType.INCOME,
            **({"date__gte": date_from} if date_from else {}),
            date__lte=date_to,
        )
        .values("credit_account__name")
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )

    expense_breakdown = list(
        Transaction.objects.filter(
            tenant=tenant,
            debit_account__account_type=AccountType.EXPENSE,
            **({"date__gte": date_from} if date_from else {}),
            date__lte=date_to,
        )
        .values("debit_account__name")
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )

    return Response({
        "total_income": income,
        "total_expenses": expenses,
        "net_profit": income - expenses,
        "income_breakdown": income_breakdown,
        "expense_breakdown": expense_breakdown,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ledger(request):
    """General ledger for a specific account."""
    tenant = request.tenant
    account_id = request.query_params.get("account_id")
    date_from = request.query_params.get("date_from")
    date_to = request.query_params.get("date_to")

    if not account_id:
        return Response({"detail": "account_id is required."}, status=400)

    try:
        account = AccountHead.objects.get(id=account_id, tenant=tenant)
    except AccountHead.DoesNotExist:
        return Response({"detail": "Account not found."}, status=404)

    qs = Transaction.objects.filter(
        tenant=tenant,
    ).filter(
        Q(debit_account=account) | Q(credit_account=account)
    ).select_related("debit_account", "credit_account").order_by("date", "created_at")

    if date_from:
        qs = qs.filter(date__gte=date_from)
    if date_to:
        qs = qs.filter(date__lte=date_to)

    opening_balance = float(account.opening_balance)
    running = opening_balance
    rows = []
    for txn in qs:
        if txn.debit_account_id == account.id:
            debit = float(txn.amount)
            credit = 0
        else:
            debit = 0
            credit = float(txn.amount)
        running += debit - credit
        rows.append({
            "date": txn.date,
            "reference": txn.reference,
            "description": txn.description,
            "debit": debit,
            "credit": credit,
            "balance": round(running, 2),
        })

    return Response({
        "account": account.name,
        "account_type": account.account_type,
        "opening_balance": opening_balance,
        "rows": rows,
        "closing_balance": round(running, 2),
    })
