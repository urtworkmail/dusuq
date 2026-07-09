#!/bin/bash
# ─── DairyCare Database Backup Script ─────────────────────────────────────────
# Usage: ./scripts/backup_db.sh
# Add to cron: 0 2 * * * /path/to/dairycare/scripts/backup_db.sh

set -e

BACKUP_DIR="$(dirname "$0")/../backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/dairycare_$TIMESTAMP.sql.gz"
KEEP_DAYS=7

# Load env
if [ -f "$(dirname "$0")/../.env" ]; then
  export $(grep -v '^#' "$(dirname "$0")/../.env" | xargs)
fi

DB_NAME="${DB_NAME:-dairycare}"
DB_USER="${DB_USER:-dairycare}"
DB_PASSWORD="${DB_PASSWORD:-dairycare_dev}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup of database: $DB_NAME"

PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-privileges \
  | gzip > "$BACKUP_FILE"

echo "[$(date)] Backup saved: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"

# Remove backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "dairycare_*.sql.gz" -mtime +$KEEP_DAYS -delete
echo "[$(date)] Removed backups older than $KEEP_DAYS days"

echo "[$(date)] Backup complete."
