import io
import json

from django.http import HttpResponse
from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers

from . import animal_importer, milk_importer, insemination_importer
from .models import ImportJob, ImportDataType, ImportStatus


class ImportJobSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True, default=None)

    class Meta:
        model = ImportJob
        fields = [
            "id", "data_type", "file_name", "status", "total_rows",
            "success_count", "error_count", "error_log", "user_name", "created_at",
        ]


class ImportJobListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ImportJobSerializer

    def get_queryset(self):
        qs = ImportJob.objects.filter(tenant=self.request.tenant).select_related("user")
        data_type = self.request.query_params.get("data_type")
        if data_type:
            qs = qs.filter(data_type=data_type)
        return qs


def _extract_column_map_override(request):
    """
    A farm can confirm/adjust the auto-suggested column mapping in the UI;
    when they do, it's sent as a JSON-encoded {field_key: column_index}
    object alongside the file. Returns None if the caller didn't send one
    (falls back to auto-detection), never a partially-invalid dict.
    """
    raw = request.data.get("column_map")
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError):
        raise ValueError("Invalid column mapping.")
    if not isinstance(parsed, dict):
        raise ValueError("Invalid column mapping.")
    return {k: v for k, v in parsed.items() if isinstance(v, int) and not isinstance(v, bool) and v >= 0}


def _template_view(importer_module, filename):
    @api_view(["GET"])
    @permission_classes([IsAuthenticated])
    def view(request):
        wb = importer_module.build_template()
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        resp = HttpResponse(
            buf.read(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp
    return view


def _columns_view(importer_module, fields):
    @api_view(["POST"])
    @permission_classes([IsAuthenticated])
    @parser_classes([MultiPartParser])
    def view(request):
        """
        First step of import: read just the header row and suggest a
        mapping, so the farm can confirm or correct it (WooCommerce-style)
        before anything is parsed row-by-row.
        """
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file provided."}, status=400)

        try:
            header_row = importer_module.read_header_row(file)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)

        suggested_map = importer_module.suggest_column_map(header_row)
        return Response({
            "headers": ["" if h is None else str(h) for h in header_row],
            "suggested_map": suggested_map,
            "fields": fields,
        })
    return view


def _preview_view(importer_module):
    @api_view(["POST"])
    @permission_classes([IsAuthenticated])
    @parser_classes([MultiPartParser])
    def view(request):
        """
        Dry-run: parses and validates the uploaded file without saving
        anything. Returns the exact same per-row shape the matching commit
        endpoint reports, so what the farm reviews here is what actually
        happens on commit.
        """
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file provided."}, status=400)

        try:
            column_map_override = _extract_column_map_override(request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)

        try:
            column_map, data_rows = importer_module.parse_workbook(file, column_map=column_map_override)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)

        results = importer_module.process_rows(request.tenant, column_map, data_rows, commit=False)
        ok_count = sum(1 for r in results if r["status"] in ("ok", "warning"))
        error_count = sum(1 for r in results if r["status"] == "error")

        return Response({
            "matched_columns": list(column_map.keys()),
            "total_rows": len(results),
            "would_import": ok_count,
            "would_error": error_count,
            "rows": results,
        })
    return view


def _commit_view(importer_module, data_type):
    @api_view(["POST"])
    @permission_classes([IsAuthenticated])
    @parser_classes([MultiPartParser])
    def view(request):
        """Actually saves the records. Re-runs the exact same validation as preview."""
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file provided."}, status=400)

        try:
            column_map_override = _extract_column_map_override(request)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)

        try:
            column_map, data_rows = importer_module.parse_workbook(file, column_map=column_map_override)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)

        results = importer_module.process_rows(
            request.tenant, column_map, data_rows, user=request.user, commit=True
        )
        ok_count = sum(1 for r in results if r["status"] in ("ok", "warning"))
        error_rows = [{"row": r["row"], "message": "; ".join(r["errors"])} for r in results if r["status"] == "error"]

        ImportJob.objects.create(
            tenant=request.tenant,
            user=request.user,
            data_type=data_type,
            file_name=getattr(file, "name", ""),
            status=ImportStatus.COMMITTED,
            total_rows=len(results),
            success_count=ok_count,
            error_count=len(error_rows),
            error_log=error_rows,
        )

        return Response({
            "total_rows": len(results),
            "imported": ok_count,
            "errors": len(error_rows),
            "rows": results,
        })
    return view


animals_template = _template_view(animal_importer, "dusuq_animal_import_template.xlsx")
animals_columns = _columns_view(animal_importer, animal_importer.FIELDS)
animals_preview = _preview_view(animal_importer)
animals_commit = _commit_view(animal_importer, ImportDataType.ANIMALS)

milk_template = _template_view(milk_importer, "dusuq_milk_import_template.xlsx")
milk_columns = _columns_view(milk_importer, milk_importer.FIELDS)
milk_preview = _preview_view(milk_importer)
milk_commit = _commit_view(milk_importer, ImportDataType.MILK)

inseminations_template = _template_view(insemination_importer, "dusuq_insemination_import_template.xlsx")
inseminations_columns = _columns_view(insemination_importer, insemination_importer.FIELDS)
inseminations_preview = _preview_view(insemination_importer)
inseminations_commit = _commit_view(insemination_importer, ImportDataType.INSEMINATIONS)
