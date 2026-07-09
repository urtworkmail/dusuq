from django.urls import path
from . import views

urlpatterns = [
    # Reproduction
    path("inseminations/", views.report_inseminations, name="report-inseminations"),
    path("calvings/", views.report_calvings, name="report-calvings"),
    path("abortions/", views.report_abortions, name="report-abortions"),

    # Health
    path("treatments/", views.report_treatments, name="report-treatments"),
    path("vaccinations/", views.report_vaccinations, name="report-vaccinations"),

    # Milk
    path("milk/daywise/", views.report_milk_daywise, name="report-milk-daywise"),
    path("milk/per-animal/", views.report_milk_animal, name="report-milk-animal"),

    # Finance
    path("transactions/", views.report_transactions, name="report-transactions"),

    # Inventory
    path("stock/", views.report_stock_summary, name="report-stock"),
    path("consumption/", views.report_consumption, name="report-consumption"),
]
