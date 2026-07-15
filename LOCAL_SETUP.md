# Dusuq ERP — Local Development Guide (Docker Desktop)

## Prerequisites

- Docker Desktop installed and running (Windows / macOS / Linux)
- Git

---

## 1. Clone the repository

```bash
git clone <your-repo-url> dusuq-erp
cd dusuq-erp
```

---

## 2. Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

```env
SECRET_KEY=replace-with-a-long-random-string-50-chars
DB_PASSWORD=choose_a_strong_password
```

Generate a Django secret key quickly:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

---

## 3. Start all services

```bash
docker compose up --build
```

The ports below come from `docker-compose.override.yml`, which Compose loads
automatically for plain `docker compose up` (no `-f` flags). Production
deployment always passes explicit `-f` flags (see `VPS_DEPLOYMENT.md`), which
makes Compose skip this file entirely — so these ports are dev-only by
construction, not by convention. Don't add `ports:` back to the services in
the base `docker-compose.yml`.

This starts:
| Service        | Port  | Description                         |
|----------------|-------|-------------------------------------|
| db (Postgres)  | 5432  | PostgreSQL 15 database              |
| redis          | 6379  | Redis for Celery queue              |
| backend        | 8000  | Django API (auto-migrates on start) |
| celery         | —     | Async task worker                   |
| celery_beat    | —     | Scheduled alert jobs                |
| frontend       | 5173  | Vite dev server (hot reload)        |
| nginx          | 80    | Reverse proxy (use this URL)        |

First build takes ~3–5 minutes. Subsequent starts are fast.

---

## 4. Create the superuser (first time only)

In a new terminal:

```bash
docker compose exec backend python manage.py createsuperuser
```

Enter email, name, and password when prompted. This gives you Django admin access.

---

## 5. Load global breeds seed data (first time only)

```bash
docker compose exec backend python manage.py shell -c "
from apps.tenants.models import Breed
breeds = [
  ('Holstein Friesian', 'cattle'), ('Jersey', 'cattle'), ('Brown Swiss', 'cattle'),
  ('Sahiwal', 'cattle'), ('Gir', 'cattle'), ('Crossbred', 'cattle'),
  ('Nili-Ravi', 'buffalo'), ('Murrah', 'buffalo'),
  ('Beetal', 'goat'), ('Teddy', 'goat'),
]
for name, species in breeds:
  Breed.objects.get_or_create(name=name, species=species, defaults={'is_global': True})
print('Breeds loaded.')
"
```

---

## 6. Register Celery Beat schedules (first time only)

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py setup_tasks
```

---

## 7. Access the application

| URL                          | What it is                        |
|------------------------------|-----------------------------------|
| http://localhost             | Dusuq ERP web app (main entry)      |
| http://localhost/api/docs/   | Swagger API documentation         |
| http://localhost/django-admin/ | Django admin panel              |

---

## 8. Register your first farm

Go to **http://localhost** → click **Create an account** → fill in farm name and owner details. You'll be logged in immediately.

---

## 9. Common commands

```bash
# View logs for a specific service
docker compose logs -f backend
docker compose logs -f celery

# Run Django management commands
docker compose exec backend python manage.py <command>

# Open Django shell
docker compose exec backend python manage.py shell

# Apply new migrations after model changes
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate

# Stop all services
docker compose down

# Stop and remove volumes (wipes the database)
docker compose down -v
```

---

## 10. Hot reload

- **Backend**: Django's `runserver` reloads automatically when you edit Python files in `./backend/`
- **Frontend**: Vite HMR reloads instantly when you edit files in `./frontend/src/`
- No container restart needed for code changes.

---

## Troubleshooting

**Port 80 in use?**  
Stop any local web server (Apache, Nginx) or change the nginx port in `docker-compose.yml`.

**Database connection errors on first start?**  
The backend waits for the healthcheck, but if it fails: `docker compose restart backend`

**Frontend shows blank page?**  
Check `docker compose logs frontend` — usually a missing `node_modules`. Run:  
`docker compose exec frontend npm install`

**"X-Tenant-ID header required" errors in the API?**  
All protected API calls require the `X-Tenant-ID` header. The frontend sets this automatically after login. For manual API testing use the Swagger docs at `/api/docs/`.
