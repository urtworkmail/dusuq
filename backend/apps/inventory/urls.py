from django.urls import path
from . import views

urlpatterns = [
    path("dashboard/", views.inventory_dashboard, name="inventory-dashboard"),
    path("products/", views.ProductListCreateView.as_view(), name="product-list"),
    path("products/<int:pk>/", views.ProductDetailView.as_view(), name="product-detail"),
    path("stock-in/", views.StockInListCreateView.as_view(), name="stock-in-list"),
    path("stock-in/<int:pk>/", views.StockInDetailView.as_view(), name="stock-in-detail"),
    path("consumption/", views.ConsumptionListCreateView.as_view(), name="consumption-list"),
    path("consumption/<int:pk>/", views.ConsumptionDetailView.as_view(), name="consumption-detail"),
    path("feed-rations/", views.FeedRationListCreateView.as_view(), name="feed-ration-list"),
    path("feed-rations/<int:pk>/", views.FeedRationDetailView.as_view(), name="feed-ration-detail"),
    path("feed-plan-summary/", views.feed_plan_summary, name="feed-plan-summary"),
]
