from django.urls import path
from . import views

urlpatterns = [
    path("dashboard/", views.accounts_dashboard, name="accounts-dashboard"),
    path("trial-balance/", views.trial_balance, name="trial-balance"),
    path("profit-and-loss/", views.profit_and_loss, name="profit-loss"),
    path("ledger/", views.ledger, name="ledger"),

    path("heads/", views.AccountHeadListCreateView.as_view(), name="account-head-list"),
    path("heads/<int:pk>/", views.AccountHeadDetailView.as_view(), name="account-head-detail"),

    path("transactions/", views.TransactionListCreateView.as_view(), name="transaction-list"),
    path("transactions/<int:pk>/", views.TransactionDetailView.as_view(), name="transaction-detail"),

    path("assets/", views.AssetListCreateView.as_view(), name="asset-list"),
    path("assets/<int:pk>/", views.AssetDetailView.as_view(), name="asset-detail"),
]
