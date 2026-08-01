"""
Milk record importer — second of the "connectors". Unlike the animal
importer, this one never creates animals: every row must reference an
animal that already exists in the farm (imported or entered manually
first), so a typo'd tag is a validation error, not a silent orphan record.
"""
import openpyxl

from apps.animals.models import Animal
from apps.milk.models import MilkRecord, MilkSession
from ._shared import build_column_map, get_col, parse_date, parse_decimal, read_header_row, read_rows

FIELD_ALIASES = {
    "tag_number": ["tag number", "tag no", "tag", "ear tag", "animal id", "animal tag"],
    "date": ["date", "milking date"],
    "session": ["session", "milking session", "am/pm", "shift"],
    "litres": ["litres", "liters", "quantity", "milk litres", "yield", "milk yield", "milk (l)"],
    "fat_percent": ["fat", "fat %", "fat percent", "fat percentage"],
    "snf_percent": ["snf", "snf %", "snf percent", "snf percentage"],
    "notes": ["notes", "remarks", "comments"],
}

REQUIRED_FIELDS = ["tag_number", "date", "session", "litres"]

FIELDS = [
    {"key": "tag_number", "label": "Tag Number", "required": True},
    {"key": "date", "label": "Date", "required": True},
    {"key": "session", "label": "Session (AM / Midday / PM)", "required": True},
    {"key": "litres", "label": "Litres", "required": True},
    {"key": "fat_percent", "label": "Fat %", "required": False},
    {"key": "snf_percent", "label": "SNF %", "required": False},
    {"key": "notes", "label": "Notes", "required": False},
]


def suggest_column_map(header_row):
    return build_column_map(header_row, FIELD_ALIASES)

SESSION_ALIASES = {
    "am": MilkSession.AM, "a.m.": MilkSession.AM, "morning": MilkSession.AM,
    "midday": MilkSession.MIDDAY, "noon": MilkSession.MIDDAY, "afternoon": MilkSession.MIDDAY,
    "pm": MilkSession.PM, "p.m.": MilkSession.PM, "evening": MilkSession.PM,
}
VALID_SESSIONS = {c[0] for c in MilkSession.choices}


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

    tag_to_animal = {
        a.tag_number: a for a in Animal.objects.filter(tenant=tenant)
    }
    existing_records = set(
        MilkRecord.objects.filter(tenant=tenant).values_list("animal_id", "date", "session")
    )
    seen_in_batch = set()

    for i, row in enumerate(data_rows, start=2):
        row_errors = []

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

        milk_date = None
        try:
            milk_date = parse_date(get_col(row, column_map, "date"))
            if milk_date is None:
                row_errors.append("date is required")
        except ValueError as e:
            row_errors.append(str(e))

        session_raw = get_col(row, column_map, "session")
        session = None
        if not session_raw:
            row_errors.append("session is required (morning/midday/evening)")
        else:
            session_norm = str(session_raw).strip().lower()
            session = SESSION_ALIASES.get(session_norm, session_norm if session_norm in VALID_SESSIONS else None)
            if session is None:
                row_errors.append(f"session '{session_raw}' not recognized (expected morning/midday/evening)")

        litres = None
        try:
            litres = parse_decimal(get_col(row, column_map, "litres"), "litres")
            if litres is None:
                row_errors.append("litres is required")
            elif litres < 0:
                row_errors.append("litres cannot be negative")
        except ValueError as e:
            row_errors.append(str(e))

        fat_percent = snf_percent = None
        try:
            fat_percent = parse_decimal(get_col(row, column_map, "fat_percent"), "fat percent")
        except ValueError as e:
            row_errors.append(str(e))
        try:
            snf_percent = parse_decimal(get_col(row, column_map, "snf_percent"), "snf percent")
        except ValueError as e:
            row_errors.append(str(e))

        notes = get_col(row, column_map, "notes") or ""

        row_data = {
            "tag_number": tag_number, "date": milk_date, "session": session, "litres": litres,
            "fat_percent": fat_percent, "snf_percent": snf_percent, "notes": notes,
        }

        if row_errors:
            results.append({"row": i, "status": "error", "errors": row_errors, "data": row_data})
            continue

        dedup_key = (animal.id, milk_date, session)
        if dedup_key in existing_records:
            results.append({
                "row": i, "status": "error",
                "errors": [f"A {session} record for '{tag_number}' on {milk_date} already exists — skipped."],
                "data": row_data,
            })
            continue
        if dedup_key in seen_in_batch:
            results.append({
                "row": i, "status": "error",
                "errors": [f"'{tag_number}' / {milk_date} / {session} appears more than once in this file — skipped."],
                "data": row_data,
            })
            continue
        seen_in_batch.add(dedup_key)

        if commit:
            MilkRecord.objects.create(
                tenant=tenant, animal=animal, date=milk_date, session=session, litres=litres,
                fat_percent=fat_percent, snf_percent=snf_percent, notes=notes, recorded_by=user,
            )

        results.append({"row": i, "status": "ok", "errors": [], "warnings": [], "data": row_data})

    return results


def build_template():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Milk Records"
    headers = ["tag_number", "date", "session", "litres", "fat_percent", "snf_percent", "notes"]
    ws.append(headers)
    ws.append(["COW-001", "2026-07-01", "am", "12.5", "3.8", "8.6", "Example row — delete before importing"])
    return wb
