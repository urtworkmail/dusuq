from django.urls import path
from . import views

urlpatterns = [
    path("dashboard/", views.milk_dashboard, name="milk-dashboard"),
    path("chiller/", views.chiller_status, name="chiller-status"),

    path("records/", views.MilkRecordListCreateView.as_view(), name="milk-record-list"),
    path("records/<int:pk>/", views.MilkRecordDetailView.as_view(), name="milk-record-detail"),
    path("records/bulk/", views.BulkMilkEntryView.as_view(), name="milk-bulk-entry"),
    path("records/entry-sheet/", views.milk_entry_sheet, name="milk-entry-sheet"),
    path("records/template/", views.milk_excel_template, name="milk-template"),
    path("records/import/", views.milk_excel_import, name="milk-import"),

    path("consumption-heads/", views.ConsumptionHeadListCreateView.as_view(), name="consumption-head-list"),
    path("consumption-heads/<int:pk>/", views.ConsumptionHeadDetailView.as_view(), name="consumption-head-detail"),

    path("consumption/", views.MilkConsumptionListCreateView.as_view(), name="milk-consumption-list"),
    path("consumption/<int:pk>/", views.MilkConsumptionDetailView.as_view(), name="milk-consumption-detail"),

    path("dispatch/", views.MilkDispatchListCreateView.as_view(), name="milk-dispatch-list"),
    path("dispatch/<int:pk>/", views.MilkDispatchDetailView.as_view(), name="milk-dispatch-detail"),
]
