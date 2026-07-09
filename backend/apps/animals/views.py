from rest_framework import generics, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
import django_filters

from .models import Animal, AnimalStatus
from .serializers import AnimalListSerializer, AnimalDetailSerializer, AnimalCreateSerializer


class AnimalFilter(django_filters.FilterSet):
    status = django_filters.MultipleChoiceFilter(choices=AnimalStatus.choices)
    shed = django_filters.NumberFilter(field_name="shed__id")
    group = django_filters.NumberFilter(field_name="group__id")
    breed = django_filters.NumberFilter(field_name="breed__id")
    sex = django_filters.CharFilter()
    is_active = django_filters.BooleanFilter()
    dob_after = django_filters.DateFilter(field_name="date_of_birth", lookup_expr="gte")
    dob_before = django_filters.DateFilter(field_name="date_of_birth", lookup_expr="lte")

    class Meta:
        model = Animal
        fields = ["status", "shed", "group", "breed", "sex", "is_active"]


class AnimalListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = AnimalFilter
    search_fields = ["tag_number", "name", "sire_tag"]
    ordering_fields = ["tag_number", "date_of_birth", "status", "lactation_number", "created_at"]
    ordering = ["tag_number"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AnimalCreateSerializer
        return AnimalListSerializer

    def get_queryset(self):
        return Animal.objects.filter(
            tenant=self.request.tenant
        ).select_related("breed", "shed", "group", "dam")

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class AnimalDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return AnimalCreateSerializer
        return AnimalDetailSerializer

    def get_queryset(self):
        return Animal.objects.filter(
            tenant=self.request.tenant
        ).select_related("breed", "shed", "group", "dam")

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({"detail": "Animal deactivated."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def animal_summary(request):
    """Quick herd position counts for dashboard widgets."""
    qs = Animal.objects.filter(tenant=request.tenant, is_active=True)
    summary = {}
    for choice in AnimalStatus.choices:
        summary[choice[0]] = qs.filter(status=choice[0]).count()
    summary["total"] = qs.count()
    summary["milking"] = qs.filter(
        status__in=["open", "inseminated", "pregnant"]
    ).count()
    return Response(summary)
