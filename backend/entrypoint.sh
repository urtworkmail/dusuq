#!/bin/sh
set -e

echo "=== Dusuq ERP Backend Startup ==="

echo "[1/5] Waiting for database..."
until pg_isready -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${DB_USER:-dairycare}" -q; do
  echo "  DB not ready, retrying in 2s..."
  sleep 2
done
echo "  DB ready."

echo "[2/5] Running makemigrations..."
python manage.py makemigrations --noinput

echo "[3/5] Running migrate..."
python manage.py migrate --noinput

if [ "$SERVICE_NAME" = "backend" ]; then
  echo "[4/5] Collecting static files..."
  python manage.py collectstatic --noinput --clear
else
  echo "[4/5] Skipping collectstatic (not backend)"
fi

echo "[5/5] Registering Celery Beat schedules..."
python manage.py setup_tasks || echo "  (setup_tasks skipped — run manually if needed)"

echo "=== Starting server ==="
exec "$@"