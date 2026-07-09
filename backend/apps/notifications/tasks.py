"""
Celery beat tasks — run daily across all active tenants.
Each task scans all tenants to keep things simple (no per-tenant scheduling overhead).
"""
import logging
from datetime import date, timedelta
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def run_daily_alerts(self):
    """Master task: dispatches all daily alert sub-tasks."""
    check_calving_due.delay()
    check_pregnancy_check_due.delay()
    check_vaccination_due.delay()
    check_deworming_due.delay()
    check_treatment_followups.delay()
    check_low_stock.delay()


@shared_task
def check_calving_due():
    from apps.tenants.models import Tenant
    from apps.reproduction.models import Insemination
    from apps.notifications.service import broadcast_to_roles
    from apps.notifications.models import NotificationType

    today = date.today()
    horizon = today + timedelta(days=7)

    for tenant in Tenant.objects.filter(is_active=True):
        for ins in Insemination.objects.filter(
            tenant=tenant, animal__status="pregnant"
        ).select_related("animal"):
            ecd = ins.expected_calving_date
            if today <= ecd <= horizon:
                days = (ecd - today).days
                broadcast_to_roles(
                    tenant=tenant,
                    roles=["owner", "manager", "veterinary"],
                    notif_type=NotificationType.CALVING_DUE,
                    title=f"Calving Due: {ins.animal.display_name}",
                    message=(
                        f"{ins.animal.display_name} (Tag: {ins.animal.tag_number}) "
                        f"is expected to calve in {days} day(s) on {ecd}."
                    ),
                    link=f"/reproduction/animals/{ins.animal_id}/",
                )


@shared_task
def check_pregnancy_check_due():
    from apps.tenants.models import Tenant
    from apps.reproduction.models import Insemination
    from apps.notifications.service import broadcast_to_roles
    from apps.notifications.models import NotificationType

    today = date.today()
    check_start = today - timedelta(days=35)
    check_end = today - timedelta(days=28)

    for tenant in Tenant.objects.filter(is_active=True):
        for ins in Insemination.objects.filter(
            tenant=tenant,
            animal__status="inseminated",
            date__gte=check_start,
            date__lte=check_end,
        ).select_related("animal"):
            broadcast_to_roles(
                tenant=tenant,
                roles=["owner", "manager", "veterinary", "technician"],
                notif_type=NotificationType.PREG_CHECK_DUE,
                title=f"Pregnancy Check Due: {ins.animal.display_name}",
                message=(
                    f"{ins.animal.display_name} (Tag: {ins.animal.tag_number}) "
                    f"was inseminated on {ins.date} and is due for a pregnancy check."
                ),
                link=f"/reproduction/animals/{ins.animal_id}/",
            )


@shared_task
def check_vaccination_due():
    from apps.tenants.models import Tenant
    from apps.health.models import Vaccination
    from apps.notifications.service import broadcast_to_roles
    from apps.notifications.models import NotificationType

    today = date.today()
    horizon = today + timedelta(days=7)

    for tenant in Tenant.objects.filter(is_active=True):
        due_vaccs = Vaccination.objects.filter(
            tenant=tenant,
            next_due_date__gte=today,
            next_due_date__lte=horizon,
        ).select_related("animal", "shed")

        seen = set()
        for vacc in due_vaccs:
            key = (tenant.id, vacc.vaccine_name, str(vacc.next_due_date))
            if key in seen:
                continue
            seen.add(key)
            subject = vacc.animal.display_name if vacc.animal else (vacc.shed.name if vacc.shed else "Group")
            broadcast_to_roles(
                tenant=tenant,
                roles=["owner", "manager", "veterinary"],
                notif_type=NotificationType.VACCINATION_DUE,
                title=f"Vaccination Due: {vacc.vaccine_name}",
                message=(
                    f"{vacc.vaccine_name} vaccination is due on {vacc.next_due_date} "
                    f"for {subject}."
                ),
                link="/health/vaccinations/",
            )


@shared_task
def check_deworming_due():
    from apps.tenants.models import Tenant
    from apps.health.models import Deworming
    from apps.notifications.service import broadcast_to_roles
    from apps.notifications.models import NotificationType

    today = date.today()
    horizon = today + timedelta(days=7)

    for tenant in Tenant.objects.filter(is_active=True):
        due = Deworming.objects.filter(
            tenant=tenant,
            next_due_date__gte=today,
            next_due_date__lte=horizon,
        ).select_related("animal", "shed")

        seen = set()
        for d in due:
            key = (tenant.id, d.product, str(d.next_due_date))
            if key in seen:
                continue
            seen.add(key)
            subject = d.animal.display_name if d.animal else (d.shed.name if d.shed else "Group")
            broadcast_to_roles(
                tenant=tenant,
                roles=["owner", "manager", "veterinary"],
                notif_type=NotificationType.DEWORMING_DUE,
                title=f"Deworming Due: {d.product}",
                message=f"Deworming with {d.product} is due on {d.next_due_date} for {subject}.",
                link="/health/dewormings/",
            )


@shared_task
def check_treatment_followups():
    from apps.tenants.models import Tenant
    from apps.health.models import Treatment
    from apps.notifications.service import broadcast_to_roles
    from apps.notifications.models import NotificationType

    today = date.today()
    horizon = today + timedelta(days=2)

    for tenant in Tenant.objects.filter(is_active=True):
        due = Treatment.objects.filter(
            tenant=tenant,
            follow_up_date__gte=today,
            follow_up_date__lte=horizon,
            outcome="ongoing",
        ).select_related("animal")

        for t in due:
            broadcast_to_roles(
                tenant=tenant,
                roles=["owner", "manager", "veterinary"],
                notif_type=NotificationType.TREATMENT_FOLLOWUP,
                title=f"Treatment Follow-up: {t.animal.display_name}",
                message=(
                    f"Follow-up required for {t.animal.display_name} "
                    f"(Diagnosis: {t.diagnosis}) on {t.follow_up_date}."
                ),
                link=f"/health/treatments/{t.id}/",
            )


@shared_task
def check_low_stock():
    from apps.tenants.models import Tenant
    from apps.inventory.models import Product
    from apps.notifications.service import broadcast_to_roles
    from apps.notifications.models import NotificationType

    for tenant in Tenant.objects.filter(is_active=True):
        for product in Product.objects.filter(tenant=tenant, is_active=True):
            if product.reorder_level > 0 and product.current_stock <= float(product.reorder_level):
                broadcast_to_roles(
                    tenant=tenant,
                    roles=["owner", "manager"],
                    notif_type=NotificationType.LOW_STOCK,
                    title=f"Low Stock: {product.name}",
                    message=(
                        f"{product.name} stock is low: {product.current_stock} {product.unit} remaining "
                        f"(reorder level: {product.reorder_level} {product.unit})."
                    ),
                    link="/inventory/",
                )
