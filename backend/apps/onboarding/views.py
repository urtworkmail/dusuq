from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.animals.models import Animal
from apps.milk.models import MilkRecord
from .models import TenantOnboarding

User = get_user_model()


def build_checklist(tenant, onboarding):
    """
    Every item is computed live against real data — a farm that added an
    animal straight through the API (not via this checklist) still gets
    credit for it, and nothing can get permanently "stuck" out of sync.
    Only `tour_completed` (item 5) isn't derivable from other tables, so it
    reads from the stored TenantOnboarding flag instead.
    """
    profile_done = bool(tenant.district and tenant.province and tenant.phone)
    return [
        {
            "key": "profile",
            "label": "Complete your farm profile",
            "description": "Add your farm's address, district and phone number.",
            "done": profile_done,
            "action_path": "/settings",
        },
        {
            "key": "animal",
            "label": "Add your first animal",
            "description": "Register an animal manually or import a spreadsheet.",
            "done": Animal.objects.filter(tenant=tenant).exists(),
            "action_path": "/animals",
        },
        {
            "key": "milk",
            "label": "Record your first milk entry",
            "description": "Log a morning or evening milking session.",
            "done": MilkRecord.objects.filter(tenant=tenant).exists(),
            "action_path": "/milk",
        },
        {
            "key": "team",
            "label": "Invite your team",
            "description": "Add a manager, vet, or milker so they can log in too.",
            "done": User.objects.filter(tenant=tenant, is_active=True).count() > 1,
            "action_path": "/settings/users",
        },
        {
            "key": "tour",
            "label": "Take the quick tour",
            "description": "A 60-second walkthrough of where everything lives.",
            "done": onboarding.tour_completed,
            "action_path": None,
        },
    ]


def status_payload(tenant, onboarding):
    steps = build_checklist(tenant, onboarding)
    completed_count = sum(1 for s in steps if s["done"])
    return {
        "steps": steps,
        "completed_count": completed_count,
        "total_count": len(steps),
        "all_done": completed_count == len(steps),
        "tour_completed": onboarding.tour_completed,
        "checklist_dismissed": onboarding.checklist_dismissed,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def onboarding_status(request):
    onboarding, _ = TenantOnboarding.objects.get_or_create(tenant=request.tenant)
    return Response(status_payload(request.tenant, onboarding))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_tour_complete(request):
    onboarding, _ = TenantOnboarding.objects.get_or_create(tenant=request.tenant)
    onboarding.tour_completed = True
    onboarding.save(update_fields=["tour_completed", "updated_at"])
    return Response(status_payload(request.tenant, onboarding))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def dismiss_checklist(request):
    onboarding, _ = TenantOnboarding.objects.get_or_create(tenant=request.tenant)
    onboarding.checklist_dismissed = True
    onboarding.save(update_fields=["checklist_dismissed", "updated_at"])
    return Response(status_payload(request.tenant, onboarding))
