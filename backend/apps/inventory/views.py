from rest_framework import serializers, generics, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum

from .models import Product, StockIn, Consumption, ProductCategory


class ProductSerializer(serializers.ModelSerializer):
    current_stock = serializers.FloatField(read_only=True)
    is_low_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        exclude = ["tenant"]
        read_only_fields = ["created_at"]

    def get_is_low_stock(self, obj):
        return obj.current_stock <= float(obj.reorder_level)


class StockInSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_unit = serializers.CharField(source="product.unit", read_only=True)

    class Meta:
        model = StockIn
        exclude = ["tenant"]
        read_only_fields = ["created_at", "total_cost"]

    def validate_product(self, product):
        if product.tenant_id != self.context["request"].tenant.id:
            raise serializers.ValidationError("Product does not belong to this farm.")
        return product


class ConsumptionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_unit = serializers.CharField(source="product.unit", read_only=True)
    shed_name = serializers.CharField(source="shed.name", read_only=True)

    class Meta:
        model = Consumption
        exclude = ["tenant"]
        read_only_fields = ["created_at"]

    def validate(self, attrs):
        product = attrs["product"]
        if product.tenant_id != self.context["request"].tenant.id:
            raise serializers.ValidationError({"product": "Product does not belong to this farm."})
        qty = float(attrs["quantity"])
        if product.current_stock < qty:
            raise serializers.ValidationError(
                {"quantity": f"Insufficient stock. Available: {product.current_stock} {product.unit}"}
            )
        return attrs


# ─── Views ────────────────────────────────────────────────────────────────────

class ProductListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "is_active"]
    search_fields = ["name"]
    ordering = ["category", "name"]

    def get_queryset(self):
        return Product.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductSerializer

    def get_queryset(self):
        return Product.objects.filter(tenant=self.request.tenant)


class StockInListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = StockInSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["product", "date"]
    search_fields = ["supplier", "invoice_number", "batch_number"]
    ordering = ["-date"]

    def get_queryset(self):
        qs = StockIn.objects.filter(tenant=self.request.tenant).select_related("product")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class StockInDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = StockInSerializer

    def get_queryset(self):
        return StockIn.objects.filter(tenant=self.request.tenant)


class ConsumptionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ConsumptionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["product", "date", "shed"]
    search_fields = ["product__name"]
    ordering = ["-date"]

    def get_queryset(self):
        qs = Consumption.objects.filter(tenant=self.request.tenant).select_related("product", "shed")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class ConsumptionDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ConsumptionSerializer

    def get_queryset(self):
        return Consumption.objects.filter(tenant=self.request.tenant)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def inventory_dashboard(request):
    tenant = request.tenant
    products = Product.objects.filter(tenant=tenant, is_active=True)

    summary = []
    for product in products:
        stock = product.current_stock
        summary.append({
            "id": product.id,
            "name": product.name,
            "category": product.category,
            "unit": product.unit,
            "current_stock": stock,
            "reorder_level": float(product.reorder_level),
            "is_low_stock": stock <= float(product.reorder_level),
        })

    by_category = {}
    for cat in ProductCategory.values:
        by_category[cat] = [p for p in summary if p["category"] == cat]

    low_stock_items = [p for p in summary if p["is_low_stock"]]

    return Response({
        "summary": summary,
        "by_category": by_category,
        "low_stock_count": len(low_stock_items),
        "low_stock_items": low_stock_items,
    })
