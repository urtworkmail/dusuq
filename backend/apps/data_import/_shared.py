"""
Small pieces shared by every per-data-type importer (animal_importer.py,
milk_importer.py, insemination_importer.py) — column-header matching and
permissive value parsing. Kept here instead of duplicated per module so a
fix (e.g. a new accepted date format) lands everywhere at once.
"""
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

import openpyxl


def normalize_header(h):
    if h is None:
        return ""
    return re.sub(r"[\s_\-]+", " ", str(h).strip().lower()).strip()


def build_column_map(header_row, field_aliases):
    """Maps canonical field name -> the actual column index found in this file's header row."""
    normalized = {normalize_header(h): i for i, h in enumerate(header_row)}
    alias_lookup = {}
    for field, aliases in field_aliases.items():
        for alias in aliases:
            alias_lookup[normalize_header(alias)] = field

    column_map = {}
    for norm_header, idx in normalized.items():
        field = alias_lookup.get(norm_header)
        if field and field not in column_map:
            column_map[field] = idx
    return column_map


def parse_date(value):
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(str(value).strip(), fmt).date()
        except ValueError:
            continue
    raise ValueError(f"unrecognized date format: {value!r}")


def parse_decimal(value, field_name):
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value).strip())
    except (InvalidOperation, ValueError):
        raise ValueError(f"{field_name} must be a number, got {value!r}")


def read_rows(file):
    """Opens the uploaded file and returns every row (values_only), header row included at index 0."""
    try:
        wb = openpyxl.load_workbook(file, data_only=True)
        ws = wb.active
    except Exception as e:
        raise ValueError(f"Couldn't read this as an Excel file: {e}")
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        raise ValueError("The file is empty.")
    return rows


def read_header_row(file):
    """Just the header row — used by the column-mapping step, which doesn't need the data rows yet."""
    return list(read_rows(file)[0])


def get_col(row, column_map, field):
    idx = column_map.get(field)
    if idx is None or idx >= len(row):
        return None
    val = row[idx]
    if isinstance(val, str):
        val = val.strip()
    return val if val != "" else None
