from django.core.management.base import BaseCommand
from django.db import transaction

from apps.tenants.models import Tenant
from apps.subscriptions.models import Plan, Subscription, SubscriptionStatus, BillingGateway

PLAN_SEED = [
    dict(
        slug="package-1",
        name="Package 1",
        tagline="Every module, no AI.",
        sort_order=1,
        has_ai_assistant=False,
        has_priority_support=False,
        has_custom_agents=False,
        has_beta_access=False,
    ),
    dict(
        slug="package-2",
        name="Package 2",
        tagline="Package 1, plus VetAssist and priority support.",
        sort_order=2,
        has_ai_assistant=True,
        has_priority_support=True,
        has_custom_agents=False,
        has_beta_access=False,
    ),
    dict(
        slug="package-3",
        name="Package 3 — Enterprise",
        tagline="Everything, plus custom agents and beta access.",
        sort_order=3,
        has_ai_assistant=True,
        has_priority_support=True,
        has_custom_agents=True,
        has_beta_access=True,
    ),
]


class Command(BaseCommand):
    help = (
        "Seeds the three subscription packages, and backfills a Subscription "
        "for any tenant that predates this feature (set to active on the "
        "top plan so nothing already in use regresses)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--backfill-plan",
            default="package-3",
            help="Plan slug to grandfather pre-existing tenants onto (default: package-3).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        for spec in PLAN_SEED:
            plan, created = Plan.objects.update_or_create(
                slug=spec["slug"], defaults={k: v for k, v in spec.items() if k != "slug"}
            )
            self.stdout.write(f"{'Created' if created else 'Updated'} plan: {plan.name}")

        backfill_slug = options["backfill_plan"]
        try:
            backfill_plan = Plan.objects.get(slug=backfill_slug)
        except Plan.DoesNotExist:
            self.stderr.write(self.style.ERROR(f"No plan with slug '{backfill_slug}' to backfill onto."))
            return

        orphaned = Tenant.objects.filter(subscription__isnull=True)
        count = 0
        for tenant in orphaned:
            Subscription.objects.create(
                tenant=tenant,
                plan=backfill_plan,
                status=SubscriptionStatus.ACTIVE,
                gateway=BillingGateway.MANUAL,
            )
            count += 1
            self.stdout.write(f"Backfilled subscription for pre-existing tenant: {tenant.name}")

        if count == 0:
            self.stdout.write("No tenants needed backfilling.")

        self.stdout.write(self.style.SUCCESS(
            f"Done. {len(PLAN_SEED)} plans seeded, {count} tenant(s) backfilled onto '{backfill_plan.name}'."
        ))
