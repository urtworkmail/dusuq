from django.urls import path
from django.http import JsonResponse


def health_check(request):
    from django.db import connection
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False
    status = 200 if db_ok else 503
    return JsonResponse({"status": "ok" if db_ok else "degraded", "db": db_ok}, status=status)


urlpatterns = [
    path("", health_check, name="health-check"),
]
