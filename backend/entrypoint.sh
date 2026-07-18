#!/bin/sh
set -e

echo "=== Dusuq ERP Backend Startup ==="

# static_files/media_files are named volumes mounted inside the bind-mounted
# /app in production — Docker creates them root:root on first use since
# there's no image content at that path to copy ownership from (they're
# nested under a bind mount, not the image filesystem). Fix ownership here
# (running as root) before dropping to appuser for the actual server process.
mkdir -p /app/staticfiles /app/media
chown -R appuser:appuser /app/staticfiles /app/media

echo "[1/5] Waiting for database..."
until pg_isready -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${DB_USER:-dairycare}" -q; do
  echo "  DB not ready, retrying in 2s..."
  sleep 2
done
echo "  DB ready."

echo "[2/5] Running makemigrations..."
gosu appuser python manage.py makemigrations --noinput

echo "[3/5] Running migrate..."
gosu appuser python manage.py migrate --noinput

if [ "$SERVICE_NAME" = "backend" ]; then
  echo "[4/5] Collecting static files..."
  gosu appuser python manage.py collectstatic --noinput --clear
else
  echo "[4/5] Skipping collectstatic (not backend)"
fi

echo "[5/5] Registering Celery Beat schedules..."
gosu appuser python manage.py setup_tasks || echo "  (setup_tasks skipped — run manually if needed)"

echo "=== Starting server ==="
exec gosu appuser "$@"