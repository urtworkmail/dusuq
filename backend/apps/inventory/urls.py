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
]
