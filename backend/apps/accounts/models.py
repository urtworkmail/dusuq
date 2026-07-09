from django.db import models
from django.core.validators import MinValueValidator


class AccountType(models.TextChoices):
    ASSET = "asset", "Asset"
    LIABILITY = "liability", "Liability"
    INCOME = "income", "Income"
    EXPENSE = "expense", "Expense"
    EQUITY = "equity", "Equity"


class AccountHead(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="account_heads")
    name = models.CharField(max_length=200)
    account_type = models.CharField(max_length=15, choices=AccountType.choices)
    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="children"
    )
    code = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    opening_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("tenant", "name")]
        ordering = ["account_type", "name"]

    def __str__(self):
        return f"{self.name} ({self.account_type})"


class TransactionType(models.TextChoices):
    CASH_IN = "cash_in", "Cash Receipt"
    CASH_OUT = "cash_out", "Cash Payment"
    JOURNAL = "journal", "Journal Entry"
    PURCHASE = "purchase", "Purchase"
    MILK_SALE = "milk_sale", "Milk Sale"
    CORPORATE_PAYMENT = "corp_payment", "Corporate Milk Payment"


class Transaction(models.Model):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="transactions")
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    date = models.DateField()
    reference = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)])

    # Double entry
    debit_account = models.ForeignKey(
        AccountHead, on_delete=models.PROTECT, related_name="debit_transactions"
    )
    credit_account = models.ForeignKey(
        AccountHead, on_delete=models.PROTECT, related_name="credit_transactions"
    )

    # Purchase-specific
    supplier_name = models.CharField(max_length=200, blank=True)
    invoice_number = models.CharField(max_length=100, blank=True)

    # Milk sale link
    milk_dispatch = models.ForeignKey(
        "milk.MilkDispatch", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="transactions"
    )

    entered_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="transactions_entered"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.transaction_type} | {self.date} | {self.amount}"


class Asset(models.Model):
    DEPRECIATION_METHOD = [("straight_line", "Straight Line")]

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="assets")
    name = models.CharField(max_length=200)
    category = models.CharField(
        max_length=50,
        choices=[
            ("machinery", "Machinery"), ("vehicle", "Vehicle"),
            ("equipment", "Equipment"), ("land", "Land"), ("building", "Building"), ("other", "Other")
        ],
        default="equipment",
    )
    purchase_date = models.DateField()
    purchase_value = models.DecimalField(max_digits=14, decimal_places=2)
    useful_life_years = models.PositiveSmallIntegerField(default=5)
    salvage_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    depreciation_method = models.CharField(
        max_length=20, choices=DEPRECIATION_METHOD, default="straight_line"
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-purchase_date"]

    def __str__(self):
        return f"{self.name} ({self.category})"

    def current_value(self, as_of=None):
        from datetime import date
        if as_of is None:
            as_of = date.today()
        years_elapsed = (as_of - self.purchase_date).days / 365.25
        if self.depreciation_method == "straight_line":
            depreciable = float(self.purchase_value) - float(self.salvage_value)
            annual_dep = depreciable / self.useful_life_years
            depreciated = min(annual_dep * years_elapsed, depreciable)
            return max(float(self.purchase_value) - depreciated, float(self.salvage_value))
        return float(self.purchase_value)
