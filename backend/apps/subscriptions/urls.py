from django.urls import path

from . import views

urlpatterns = [
    path("me/", views.my_subscription, name="subscription-me"),
    path("ai-usage/", views.AIUsageListView.as_view(), name="subscription-ai-usage"),
    path("invoices/", views.InvoiceListView.as_view(), name="subscription-invoices"),
]
