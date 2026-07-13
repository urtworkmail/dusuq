"""
Builds structured, tenant-scoped context from the farm's own data before any
question is sent to Gemini. VetAssist always checks the farm's records first —
external research (see gemini_client.py) only supplements what's missing.
"""
from datetime import date, timedelta

from django.db.models import Count

from apps.animals.models import Animal
from apps.milk.models import MilkRecord, MilkDispatch
from apps.health.models import Treatment, Vaccination, Deworming, DiseaseEvent
from apps.reproduction.models import Insemination, PregnancyTest, Calving
from apps.accounts.models import Transaction


def _animal_by_tag(tenant, tag_number):
    return Animal.objects.filter(tenant=tenant, tag_number=tag_number).select_related(
        "breed", "shed", "group", "dam"
    ).first()


def animal_context(tenant, tag_number, days=90):
    """Everything on record for a single animal across every module."""
    animal = _animal_by_tag(tenant, tag_number)
    if animal is None:
        return None

    since = date.today() - timedelta(days=days)

    milk = list(
        MilkRecord.objects.filter(tenant=tenant, animal=animal, date__gte=since)
        .order_by("date", "session")
        .values("date", "session", "litres", "fat_percent", "snf_percent")
    )
    treatments = list(
        Treatment.objects.filter(tenant=tenant, animal=animal, date__gte=since)
        .order_by("-date")
        .values("date", "diagnosis", "drug", "dosage", "withdrawal_days", "outcome")
    )
    vaccinations = list(
        Vaccination.objects.filter(tenant=tenant, animal=animal, date__gte=since)
        .order_by("-date")
        .values("date", "vaccine_name", "next_due_date")
    )
    dewormings = list(
        Deworming.objects.filter(tenant=tenant, animal=animal, date__gte=since)
        .order_by("-date")
        .values("date", "product", "next_due_date")
    )
    diseases = list(
        DiseaseEvent.objects.filter(tenant=tenant, animal=animal, date__gte=since)
        .order_by("-date")
        .values("date", "disease_name", "severity", "symptoms", "resolved_date")
    )
    inseminations = list(
        Insemination.objects.filter(tenant=tenant, animal=animal)
        .order_by("-date")[:5]
        .values("date", "insemination_type", "semen_batch", "repeat_number")
    )
    pregnancy_tests = list(
        PregnancyTest.objects.filter(tenant=tenant, animal=animal)
        .order_by("-date")[:5]
        .values("date", "method", "result")
    )
    calvings = list(
        Calving.objects.filter(tenant=tenant, dam=animal)
        .order_by("-calving_date")[:5]
        .values("calving_date", "calving_type", "dam_condition")
    )

    return {
        "entity_type": "animal",
        "tag_number": animal.tag_number,
        "name": animal.name,
        "breed": animal.breed.name if animal.breed_id else None,
        "sex": animal.sex,
        "status": animal.status,
        "shed": animal.shed.name if animal.shed_id else None,
        "group": animal.group.name if animal.group_id else None,
        "lactation_number": animal.lactation_number,
        "date_of_birth": animal.date_of_birth,
        "milk_records": milk,
        "treatments": treatments,
        "vaccinations": vaccinations,
        "dewormings": dewormings,
        "disease_events": diseases,
        "inseminations": inseminations,
        "pregnancy_tests": pregnancy_tests,
        "calvings": calvings,
    }


def herd_context(tenant, shed_id=None, group_id=None, days=90):
    """Aggregate context for a shed, a group, or the whole farm."""
    animals = Animal.objects.filter(tenant=tenant, is_active=True)
    scope = "farm"
    if shed_id:
        animals = animals.filter(shed_id=shed_id)
        scope = "shed"
    elif group_id:
        animals = animals.filter(group_id=group_id)
        scope = "group"

    since = date.today() - timedelta(days=days)
    animal_ids = list(animals.values_list("id", flat=True))

    milk_total = (
        MilkRecord.objects.filter(tenant=tenant, animal_id__in=animal_ids, date__gte=since)
        .values_list("litres", flat=True)
    )
    treatments_count = Treatment.objects.filter(
        tenant=tenant, animal_id__in=animal_ids, date__gte=since
    ).count()
    due_vaccinations = Vaccination.objects.filter(
        tenant=tenant, animal_id__in=animal_ids, next_due_date__lte=date.today() + timedelta(days=7)
    ).count()

    status_breakdown = {
        row["status"]: row["count"]
        for row in animals.values("status").annotate(count=Count("id"))
    }

    return {
        "entity_type": scope,
        "animal_count": animals.count(),
        "status_breakdown": status_breakdown,
        "milk_total_litres_period": float(sum(milk_total)) if milk_total else 0,
        "treatments_last_period": treatments_count,
        "vaccinations_due_next_7_days": due_vaccinations,
        "period_days": days,
    }


def finance_context(tenant, days=90):
    since = date.today() - timedelta(days=days)
    txns = Transaction.objects.filter(tenant=tenant, date__gte=since)
    dispatch = MilkDispatch.objects.filter(tenant=tenant, date__gte=since)

    return {
        "entity_type": "finance",
        "period_days": days,
        "transaction_count": txns.count(),
        "milk_revenue_period": float(
            sum(dispatch.values_list("amount_received", flat=True)) or 0
        ),
        "outstanding_dispatch_payments": float(
            sum(
                (d.total_amount - d.amount_received)
                for d in dispatch.only("total_amount", "amount_received")
                if d.total_amount > d.amount_received
            )
        ),
    }


def resolve_context(tenant, question=None, entity_type=None, entity_id=None):
    """
    Best-effort router: given a free-text question or an explicit entity
    reference, gather the most relevant context to hand to Gemini.
    """
    if entity_type == "animal" and entity_id:
        ctx = animal_context(tenant, entity_id)
        if ctx:
            return ctx
    if entity_type == "shed" and entity_id:
        return herd_context(tenant, shed_id=entity_id)
    if entity_type == "group" and entity_id:
        return herd_context(tenant, group_id=entity_id)
    if entity_type == "farm" or entity_type is None:
        return {
            "herd": herd_context(tenant),
            "finance": finance_context(tenant),
        }
    return herd_context(tenant)
