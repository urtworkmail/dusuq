FROM python:3.11-slim

# System deps
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    postgresql-client \
    curl \
    procps \
    gosu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create non-root user. The container starts as root (see entrypoint.sh) so
# it can fix ownership of the static_files/media_files named volumes at
# startup — those get mounted *inside* the bind-mounted /app in production,
# so Docker's usual "copy ownership from image" volume init never applies to
# them, they're always created root:root on first use. entrypoint.sh chowns
# them, then drops to appuser via gosu before exec'ing the actual server
# process — the code that handles untrusted requests never runs as root.
RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /app \
    && chmod +x /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# This image is shared by three services (backend, celery, celery_beat — see
# docker-compose.yml's SERVICE_NAME env var), only one of which actually serves
# HTTP on 8000. A single curl-based check would report celery/celery_beat as
# permanently unhealthy since nothing is ever listening on that port there.
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD sh -c '\
        if [ "$SERVICE_NAME" = "backend" ]; then \
            curl -f http://localhost:8000/api/health/ || exit 1; \
        elif [ "$SERVICE_NAME" = "celery" ]; then \
            celery -A config inspect ping -d "celery@$HOSTNAME" || exit 1; \
        else \
            pgrep -f "celery.*beat" > /dev/null || exit 1; \
        fi'
