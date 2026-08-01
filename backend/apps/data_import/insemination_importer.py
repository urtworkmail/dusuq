"""
Insemination history importer — third connector. Like milk records, every
row must reference an animal that already exists in the farm. Technician is
matched by name on a best-effort basis (it's an FK to a User, not free
text) — an unmatched name is left unlinked with a warning, never an error,
since the insemination itself is still perfectly valid without it.
"""
import openpyxl

from apps.animals.models import Animal, AnimalStatus
from apps.reproduction.models import Insemination, InseminationType
from apps.users.models import User
from ._shared import build_column_map, get_col, parse_date, parse_decimal, read_header_row, read_rows

FIELD_ALIASES = {
    "tag_number": ["tag number", "tag no", "tag", "ear tag", "animal id", "animal tag"],
    "date": ["date", "insemination date"],
    "insemination_type": ["type", "insemination type", "method"],
    "semen_batch": ["semen batch", "batch number", "batch", "embryo batch"],
    "bull_tag": ["bull tag", "bull id"],
    "technician_name": ["technician", "technician name"],
    "veterinary_practitioner_number": ["vet license", "vet number", "veterinary practitioner number", "vet reg number"],
    "semen_source_company": ["source company", "semen source company", "collection company"],
    "semen_supplier_company": ["supplier company", "semen supplier company", "distributor"],
    "bull_breed": ["bull breed", "sire breed"],
    "donor_dam_breed": ["donor dam breed", "donor breed"],
    "repeat_number": ["repeat", "repeat number", "repeat #"],
    "notes": ["notes", "remarks", "comments"],
}

REQUIRED_FIELDS = ["tag_number", "date"]

FIELDS = [
    {"key": "tag_number", "label": "Tag Number", "required": True},
    {"key": "date", "label": "Date", "required": True},
    {"key": "insemination_type", "label": "Type (AI / Natural / Embryo)", "required": False},
    {"key": "semen_batch", "label": "Semen / Embryo Batch", "required": False},
    {"key": "technician_name", "label": "Technician Name", "required": False},
    {"key": "veterinary_practitioner_number", "label": "Vet Practitioner #", "required": False},
    {"key": "semen_source_company", "label": "Semen Source Company", "required": False},
    {"key": "semen_supplier_company", "label": "Semen Supplier Company", "required": False},
    {"key": "bull_breed", "label": "Bull / Sire Breed", "required": False},
    {"key": "donor_dam_breed", "label": "Donor Dam Breed", "required": False},
    {"key": "bull_tag", "label": "Bull Tag (natural service)", "required": False},
    {"key": "repeat_number", "label": "Repeat #", "required": False},
    {"key": "notes", "label": "Notes", "required": False},
]

TYPE_ALIASES = {
    "ai": InseminationType.AI, "artificial insemination": InseminationType.AI,
    "natural": InseminationType.NATURAL, "natural service": InseminationType.NATURAL, "bull": InseminationType.NATURAL,
    "embryo": InseminationType.EMBRYO, "embryo transfer": InseminationType.EMBRYO,
}


def suggest_column_map(header_row):
    return build_column_map(header_row, FIELD_ALIASES)


def parse_workbook(file, column_map=None):
    rows = read_rows(file)
    header_row = rows[0]
    if column_map is None:
        column_map = suggest_column_map(header_row)

    missing = [f for f in REQUIRED_FIELDS if f not in column_map]
    if missing:
        raise ValueError(
            f"Couldn't find a column for: {', '.join(missing)}. "
            f"Recognized header variants for tag number include: {', '.join(FIELD_ALIASES['tag_number'])}."
        )

    data_rows = [r for r in rows[1:] if any(c is not None and str(c).strip() != "" for c in r)]
    return column_map, data_rows


def process_rows(tenant, column_map, data_rows, user=None, commit=False):
    results = []

    tag_to_animal = {a.tag_number: a for a in Animal.objects.filter(tenant=tenant)}
    tech_by_name = {
        u.get_full_name().strip().lower(): u for u in User.objects.filter(tenant=tenant, is_active=True)
    }

    for i, row in enumerate(data_rows, start=2):
        row_errors = []
        row_warnings = []

        tag_number = get_col(row, column_map, "tag_number")
        if not tag_number:
            results.append({"row": i, "status": "error", "errors": ["tag_number is required"], "data": None})
            continue
        tag_number = str(tag_number).strip()

        animal = tag_to_animal.get(tag_number)
        if not animal:
            results.append({
                "row": i, "status": "error",
                "errors": [f"No animal with tag '{tag_number}' found in this farm — add or import it first."],
                "data": None,
            })
            continue

        ins_date = None
        try:
            ins_date = parse_date(get_col(row, column_map, "date"))
            if ins_date is None:
                row_errors.append("date is required")
        except ValueError as e:
            row_errors.append(str(e))

        type_raw = get_col(row, column_map, "insemination_type")
        ins_type = InseminationType.AI
        if type_raw:
            type_norm = str(type_raw).strip().lower()
            matched = TYPE_ALIASES.get(type_norm)
            if matched is None:
                row_errors.append(f"insemination type '{type_raw}' not recognized (expected AI/Natural/Embryo)")
            else:
                ins_type = matched

        repeat_raw = get_col(row, column_map, "repeat_number")
        repeat_number = 1
        if repeat_raw is not None:
            try:
                repeat_number = int(repeat_raw)
            except (ValueError, TypeError):
                row_errors.append(f"repeat number must be a whole number, got {repeat_raw!r}")

        technician_name = get_col(row, column_map, "technician_name")
        technician = None
        if technician_name:
            technician = tech_by_name.get(str(technician_name).strip().lower())
            if technician is None:
                row_warnings.append(f"technician '{technician_name}' not found — left unlinked")

        semen_batch = get_col(row, column_map, "semen_batch") or ""
        bull_tag = get_col(row, column_map, "bull_tag") or ""
        vet_number = get_col(row, column_map, "veterinary_practitioner_number") or ""
        source_co = get_col(row, column_map, "semen_source_company") or ""
        supplier_co = get_col(row, column_map, "semen_supplier_company") or ""
        bull_breed = get_col(row, column_map, "bull_breed") or ""
        donor_dam_breed = get_col(row, column_map, "donor_dam_breed") or ""
        notes = get_col(row, column_map, "notes") or ""

        row_data = {
            "tag_number": tag_number, "date": ins_date, "insemination_type": ins_type,
            "semen_batch": semen_batch, "bull_tag": bull_tag,
            "technician_name": technician.get_full_name() if technician else (technician_name or None),
            "veterinary_practitioner_number": vet_number, "semen_source_company": source_co,
            "semen_supplier_company": supplier_co, "bull_breed": bull_breed,
            "donor_dam_breed": donor_dam_breed, "repeat_number": repeat_number, "notes": notes,
        }

        if row_errors:
            results.append({"row": i, "status": "error", "errors": row_errors, "data": row_data})
            continue

        if commit:
            Insemination.objects.create(
                tenant=tenant, animal=animal, insemination_type=ins_type, date=ins_date,
                semen_batch=semen_batch, semen_source_company=source_co, semen_supplier_company=supplier_co,
                bull_breed=bull_breed, donor_dam_breed=donor_dam_breed, technician=technician,
                veterinary_practitioner_number=vet_number, bull_tag=bull_tag,
                repeat_number=repeat_number, notes=notes,
            )
            # Mirror the same status transition InseminationSerializer.create() applies
            # when an insemination is logged through the normal form, so bulk-imported
            # history keeps animal status consistent with hand-entered records.
            if animal.status in (AnimalStatus.OPEN, AnimalStatus.HEIFER):
                animal.status = AnimalStatus.INSEMINATED
                animal.save(update_fields=["status"])

        results.append({
            "row": i, "status": "ok" if not row_warnings else "warning",
            "errors": [], "warnings": row_warnings, "data": row_data,
        })

    return results


def build_template():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Inseminations"
    headers = [
        "tag_number", "date", "insemination_type", "semen_batch", "technician_name",
        "veterinary_practitioner_number", "semen_source_company", "semen_supplier_company",
        "bull_breed", "donor_dam_breed", "bull_tag", "repeat_number", "notes",
    ]
    ws.append(headers)
    ws.append([
        "COW-001", "2026-07-01", "ai", "SB-4521", "", "", "ABC Genetics", "XYZ Distributors",
        "Sahiwal", "", "", "1", "Example row — delete before importing",
    ])
    return wb
