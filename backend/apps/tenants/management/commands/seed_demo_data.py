import random
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model

from apps.tenants.models import Tenant, Shed, AnimalGroup, Breed
from apps.animals.models import Animal, AnimalStatus, Sex
from apps.milk.models import MilkRecord, MilkSession, ConsumptionHead, MilkConsumption, MilkDispatch
from apps.health.models import Treatment, Vaccination, Deworming, DiseaseEvent
from apps.reproduction.models import Insemination, PregnancyTest, DryOff, Calving
from apps.inventory.models import Product, StockIn, Consumption
from apps.accounts.models import AccountHead, AccountType, Transaction, TransactionType, Asset

User = get_user_model()

BREED_SEED = [
    ("Sahiwal", "cattle"), ("Holstein Friesian", "cattle"), ("Jersey", "cattle"),
    ("Nili-Ravi", "buffalo"), ("Murrah", "buffalo"),
]

ANIMAL_NAMES = [
    "Moti", "Sheeba", "Rani", "Laila", "Chandni", "Gulabo", "Kesar", "Nooran",
    "Sona", "Meera", "Deepa", "Anaya",
]


class Command(BaseCommand):
    help = "Seed a tenant with realistic demo data — animals, milk, health, breeding, inventory and accounts."

    def add_arguments(self, parser):
        parser.add_argument("--email", help="Owner email of the tenant to seed (recommended).")
        parser.add_argument("--slug", help="Farm slug of the tenant to seed, alternative to --email.")
        parser.add_argument("--force", action="store_true", help="Seed even if this tenant already has animals.")

    def handle(self, *args, **options):
        tenant = self._resolve_tenant(options)
        owner = User.objects.filter(tenant=tenant).order_by("date_joined").first()
        if owner is None:
            raise CommandError(f"Tenant '{tenant.name}' has no users — cannot attribute demo records.")

        if Animal.objects.filter(tenant=tenant).exists() and not options["force"]:
            raise CommandError(
                f"Tenant '{tenant.name}' already has animals. Re-run with --force to add more demo data anyway."
            )

        self.stdout.write(f"Seeding demo data for '{tenant.name}' (owner: {owner.email})...")

        sheds = self._seed_sheds(tenant)
        groups = self._seed_groups(tenant)
        breeds = self._seed_breeds(tenant)
        animals = self._seed_animals(tenant, sheds, groups, breeds)
        heads = self._seed_account_heads(tenant)
        self._seed_milk(tenant, animals, owner, heads)
        self._seed_health(tenant, animals, owner)
        self._seed_reproduction(tenant, animals, owner)
        self._seed_inventory(tenant, animals, heads)
        self._seed_assets(tenant)

        self.stdout.write(self.style.SUCCESS(
            f"Done. {len(animals)} animals, ~60 days of milk records, health/breeding history, "
            f"inventory and a starter chart of accounts."
        ))

    # ── Resolution ──────────────────────────────────────────────────────────

    def _resolve_tenant(self, options):
        if options.get("email"):
            user = User.objects.filter(email=options["email"]).select_related("tenant").first()
            if user is None or user.tenant is None:
                raise CommandError(f"No user with a tenant found for email '{options['email']}'.")
            return user.tenant
        if options.get("slug"):
            try:
                return Tenant.objects.get(slug=options["slug"])
            except Tenant.DoesNotExist:
                raise CommandError(f"No tenant with slug '{options['slug']}'.")
        tenant = Tenant.objects.order_by("-created_at").first()
        if tenant is None:
            raise CommandError("No tenants exist yet — register a farm account first.")
        self.stdout.write(f"No --email/--slug given — using most recently created tenant: {tenant.name}")
        return tenant

    # ── Structure ────────────────────────────────────────────────────────────

    def _seed_sheds(self, tenant):
        names = [("Shed 1", 30), ("Shed 2", 25), ("Calf Pen", 10)]
        return [Shed.objects.get_or_create(tenant=tenant, name=n, defaults={"capacity": c})[0] for n, c in names]

    def _seed_groups(self, tenant):
        names = ["High Yielders", "Dry Group", "Heifers"]
        return [AnimalGroup.objects.get_or_create(tenant=tenant, name=n)[0] for n in names]

    def _seed_breeds(self, tenant):
        breeds = list(Breed.objects.filter(is_global=True))
        if not breeds:
            breeds = [
                Breed.objects.get_or_create(tenant=tenant, name=n, species=s, defaults={"is_global": False})[0]
                for n, s in BREED_SEED
            ]
        return breeds

    def _seed_animals(self, tenant, sheds, groups, breeds):
        statuses = [
            AnimalStatus.OPEN, AnimalStatus.OPEN, AnimalStatus.OPEN,
            AnimalStatus.INSEMINATED, AnimalStatus.PREGNANT, AnimalStatus.PREGNANT,
            AnimalStatus.DRY, AnimalStatus.HEIFER, AnimalStatus.HEIFER,
            AnimalStatus.SICK, AnimalStatus.OPEN, AnimalStatus.OPEN,
        ]
        animals = []
        today = date.today()
        for i, status in enumerate(statuses, start=1):
            tag = f"COW-{i:03d}"
            dob = today - timedelta(days=random.randint(365 * 2, 365 * 7))
            animal = Animal.objects.create(
                tenant=tenant,
                tag_number=tag,
                name=ANIMAL_NAMES[(i - 1) % len(ANIMAL_NAMES)],
                breed=random.choice(breeds),
                sex=Sex.FEMALE,
                date_of_birth=dob,
                status=status,
                shed=sheds[i % len(sheds)] if status != AnimalStatus.HEIFER else sheds[-1],
                group=groups[0] if status == AnimalStatus.OPEN else (
                    groups[1] if status in (AnimalStatus.DRY, AnimalStatus.PREGNANT) else groups[2]
                ),
                lactation_number=random.randint(1, 5) if status != AnimalStatus.HEIFER else 0,
                purchase_price=Decimal(random.randint(120000, 280000)) if random.random() < 0.4 else None,
                weight_kg=Decimal(random.randint(320, 480)),
            )
            animals.append(animal)
        return animals

    # ── Milk ─────────────────────────────────────────────────────────────────

    def _seed_milk(self, tenant, animals, owner, heads):
        milking = [a for a in animals if a.is_milking]
        today = date.today()

        for days_ago in range(60, 0, -1):
            d = today - timedelta(days=days_ago)
            for animal in milking:
                base = float(random.uniform(8, 22))
                for session in (MilkSession.AM, MilkSession.PM):
                    litres = round(base * (0.55 if session == MilkSession.AM else 0.45) + random.uniform(-1, 1), 1)
                    MilkRecord.objects.create(
                        tenant=tenant, animal=animal, date=d, session=session,
                        litres=max(litres, 0.5),
                        fat_percent=Decimal(str(round(random.uniform(3.4, 5.2), 2))) if random.random() < 0.3 else None,
                        snf_percent=Decimal(str(round(random.uniform(8.0, 9.2), 2))) if random.random() < 0.3 else None,
                        recorded_by=owner,
                    )

        head = ConsumptionHead.objects.get_or_create(tenant=tenant, name="Calf Feeding")[0]
        for days_ago in range(30, 0, -3):
            MilkConsumption.objects.create(
                tenant=tenant, head=head, date=today - timedelta(days=days_ago),
                litres=Decimal(str(round(random.uniform(4, 9), 1))),
            )

        milk_income = heads["milk_income"]
        cash = heads["cash"]
        for days_ago in range(30, 0, -5):
            d = today - timedelta(days=days_ago)
            gross = Decimal(str(round(random.uniform(180, 320), 1)))
            price = Decimal("135.00")
            total = (gross * price).quantize(Decimal("0.01"))
            dispatch = MilkDispatch.objects.create(
                tenant=tenant, dispatch_type="corporate", date=d, buyer_name="Nestlé Collection Point",
                gross_litres=gross, fat_percent=Decimal("4.1"), snf_percent=Decimal("8.6"),
                price_per_litre=price, total_amount=total, amount_received=total,
            )
            Transaction.objects.create(
                tenant=tenant, transaction_type=TransactionType.MILK_SALE, date=d,
                description=f"Milk sale — {dispatch.buyer_name}", amount=total,
                debit_account=cash, credit_account=milk_income,
                milk_dispatch=dispatch, entered_by=owner,
            )

    # ── Health ───────────────────────────────────────────────────────────────

    def _seed_health(self, tenant, animals, owner):
        today = date.today()
        sick = [a for a in animals if a.status == AnimalStatus.SICK] or animals[:1]
        for animal in sick:
            Treatment.objects.create(
                tenant=tenant, animal=animal, date=today - timedelta(days=4),
                diagnosis="Mastitis (mild)", drug="Oxytetracycline", dosage="10ml",
                route="injection", withdrawal_days=5, administered_by=owner,
                cost=Decimal("800"), outcome="ongoing",
            )
            DiseaseEvent.objects.create(
                tenant=tenant, animal=animal, date=today - timedelta(days=4),
                disease_name="Mastitis", severity="mild", symptoms="Swelling, reduced yield",
            )

        for animal in animals[:8]:
            Vaccination.objects.create(
                tenant=tenant, animal=animal, vaccine_name="FMD Vaccine",
                date=today - timedelta(days=random.randint(30, 200)),
                next_due_date=today + timedelta(days=random.randint(-10, 60)),
                administered_by=owner, cost=Decimal("250"),
            )
            Deworming.objects.create(
                tenant=tenant, animal=animal, product="Albendazole",
                date=today - timedelta(days=random.randint(10, 90)),
                next_due_date=today + timedelta(days=random.randint(-5, 45)),
                cost=Decimal("150"),
            )

    # ── Reproduction ─────────────────────────────────────────────────────────

    def _seed_reproduction(self, tenant, animals, owner):
        today = date.today()
        inseminated = [a for a in animals if a.status in (AnimalStatus.INSEMINATED, AnimalStatus.PREGNANT)]
        for animal in inseminated:
            insem_date = today - timedelta(days=random.randint(20, 250))
            insem = Insemination.objects.create(
                tenant=tenant, animal=animal, insemination_type="ai",
                date=insem_date, semen_batch=f"SB-{random.randint(1000,9999)}",
                technician=owner,
            )
            if animal.status == AnimalStatus.PREGNANT:
                PregnancyTest.objects.create(
                    tenant=tenant, animal=animal, insemination=insem,
                    date=insem_date + timedelta(days=45), method="rectal", result="positive",
                    conducted_by=owner,
                )

        dry = [a for a in animals if a.status == AnimalStatus.DRY]
        for animal in dry:
            DryOff.objects.create(
                tenant=tenant, animal=animal, dry_off_date=today - timedelta(days=30),
                expected_calving_date=today + timedelta(days=30),
            )

        if animals:
            dam = animals[0]
            Calving.objects.create(
                tenant=tenant, dam=dam, calving_date=today - timedelta(days=90),
                calving_type="normal", dam_condition="good",
                calf_tag=f"CALF-{random.randint(100,999)}", calf_sex="female",
                calf_weight_kg=Decimal("28.5"),
            )

    # ── Inventory ────────────────────────────────────────────────────────────

    def _seed_inventory(self, tenant, animals, heads):
        today = date.today()
        products = [
            ("Cotton Seed Cake", "feed", "kg", 500, 85),
            ("Wheat Bran", "feed", "kg", 300, 55),
            ("Mineral Mixture", "feed", "kg", 50, 210),
            ("Oxytetracycline", "medicine", "ml", 20, 12),
            ("Albendazole", "medicine", "ml", 15, 9),
            ("FMD Vaccine", "medicine", "dose", 30, 250),
            ("AI Semen Straws", "semen", "straw", 10, 1500),
        ]
        for name, cat, unit, reorder, cost in products:
            product = Product.objects.get_or_create(
                tenant=tenant, name=name,
                defaults={"category": cat, "unit": unit, "reorder_level": reorder, "cost_per_unit": cost},
            )[0]
            StockIn.objects.create(
                tenant=tenant, product=product, date=today - timedelta(days=20),
                quantity=Decimal(reorder * 3), cost_per_unit=Decimal(cost),
                supplier="Local Agri Supplier", batch_number=f"B{random.randint(100,999)}",
            )
            for days_ago in range(15, 0, -5):
                Consumption.objects.create(
                    tenant=tenant, product=product, date=today - timedelta(days=days_ago),
                    quantity=Decimal(round(reorder * random.uniform(0.05, 0.15), 1)),
                    animal=random.choice(animals) if cat == "medicine" else None,
                )

        feed_expense = heads["feed_expense"]
        cash = heads["cash"]
        Transaction.objects.create(
            tenant=tenant, transaction_type=TransactionType.PURCHASE, date=today - timedelta(days=20),
            description="Feed purchase — Cotton Seed Cake & Wheat Bran", amount=Decimal("42500"),
            debit_account=feed_expense, credit_account=cash, supplier_name="Local Agri Supplier",
        )

    # ── Accounts ─────────────────────────────────────────────────────────────

    def _seed_account_heads(self, tenant):
        def head(name, atype):
            return AccountHead.objects.get_or_create(
                tenant=tenant, name=name, defaults={"account_type": atype}
            )[0]

        cash = head("Cash & Bank", AccountType.ASSET)
        milk_income = head("Milk Sales Income", AccountType.INCOME)
        feed_expense = head("Feed Expense", AccountType.EXPENSE)
        medicine_expense = head("Medicine Expense", AccountType.EXPENSE)
        payable = head("Accounts Payable", AccountType.LIABILITY)
        equity = head("Owner's Equity", AccountType.EQUITY)

        if not Transaction.objects.filter(tenant=tenant, transaction_type=TransactionType.CASH_IN).exists():
            Transaction.objects.create(
                tenant=tenant, transaction_type=TransactionType.CASH_IN,
                date=date.today() - timedelta(days=59),
                description="Owner's opening capital", amount=Decimal("500000"),
                debit_account=cash, credit_account=equity,
            )

        return {
            "cash": cash, "milk_income": milk_income, "feed_expense": feed_expense,
            "medicine_expense": medicine_expense, "payable": payable, "equity": equity,
        }

    def _seed_assets(self, tenant):
        Asset.objects.get_or_create(
            tenant=tenant, name="Milk Chiller (1000L)",
            defaults=dict(
                category="equipment", purchase_date=date.today() - timedelta(days=400),
                purchase_value=Decimal("650000"), useful_life_years=8, salvage_value=Decimal("50000"),
            ),
        )
