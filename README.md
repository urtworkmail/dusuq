# Dusuq ERP — Dairy Farm Management System

**Dusuq** is a comprehensive **Enterprise Resource Planning (ERP) system** designed specifically for dairy farms and livestock operations. It streamlines farm management across animals, milk production, health monitoring, breeding, inventory, and customer support — all in one integrated platform.

**Live Demo:** https://app.dusuq.com  
**Marketing Site:** https://dusuq.com  
**Documentation:** https://dusuq.com/docs

---

## Table of Contents

- [What This Project Does](#what-this-project-does)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
  - [Local Development](#local-development)
  - [Production Deployment](#production-deployment)
- [Features](#features)
- [Architecture](#architecture)
- [Development Workflow](#development-workflow)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Support](#support)

---

## What This Project Does

Dusuq ERP helps dairy farm owners and managers:

- **Track Animals:** Manage cattle, buffalo, and goats with detailed profiles, genealogy, and lifecycle tracking
- **Monitor Milk Production:** Log daily milk yields, track quality metrics, and analyze production trends
- **Health Management:** Record health events, vaccinations, treatments, and generate health reports
- **Breeding & Reproduction:** Plan breeding cycles, track pregnancies, and manage breeding records
- **Inventory Management:** Monitor feed, supplies, and equipment across the farm
- **Multi-tenant Support:** Run multiple farm operations from a single system (role-based access)
- **VetAssist (AI):** Optional Google Gemini-powered assistant for veterinary queries, health forecasting, and predictive analytics
- **Reports & Analytics:** Generate production reports, export data to Excel/PDF, and visualize trends
- **Support Tickets & Contact Forms:** Integrated customer support with cross-origin messaging between marketing site and app

The system is built as a full-stack monolith with clear separation: React frontend, Django REST API, PostgreSQL database, and Redis-powered async jobs.

---

## Technology Stack

### Backend (Python)

- **Framework:** Django 4.2 + Django REST Framework
- **Database:** PostgreSQL 15
- **Task Queue:** Celery + Redis
- **Job Scheduling:** Celery Beat
- **Authentication:** JWT (SimpleJWT)
- **API Docs:** drf-spectacular (Swagger)
- **Data Export:** WeasyPrint (PDF), openpyxl (Excel)
- **AI/ML:** Google Generative AI (Gemini 2.0 Flash)
- **Core Dependencies:**
  - `django-cors-headers` — Cross-origin API calls from marketing site
  - `django-filter` — Advanced filtering on model list endpoints
  - `django-celery-beat` — Scheduled tasks (alerts, summaries)
  - `Pillow` — Image processing (animal photos)
  - `python-dateutil` — Date arithmetic and parsing

### Frontend (JavaScript/React)

- **Framework:** React 18 + Vite
- **Routing:** React Router 6
- **HTTP Client:** Axios
- **State Management & Caching:** TanStack Query (React Query) v5
- **UI Components:** Headless UI, Lucide React icons
- **Forms:** React Hook Form
- **Date Handling:** date-fns
- **Charts/Analytics:** Recharts
- **Notifications:** react-hot-toast
- **Styling:** Tailwind CSS + PostCSS

### Infrastructure

- **Containerization:** Docker & Docker Compose
- **Web Server:** Nginx 1.25 (reverse proxy, static serving)
- **SSL/TLS:** Let's Encrypt with Certbot (production)
- **Deployment:** Docker Compose on Ubuntu 22.04 LTS VPS

---

## Project Structure

```
dusuq-erp/
├── backend/                    # Django REST API
│   ├── apps/                   # Feature modules
│   │   ├── accounts/           # User accounts & authentication
│   │   ├── animals/            # Animal profiles, genealogy, tracking
│   │   ├── contact/            # Contact form submissions (from marketing site)
│   │   ├── health/             # Health events, vaccinations, treatments
│   │   ├── inventory/          # Feed, supplies, equipment tracking
│   │   ├── milk/               # Milk production logs & analytics
│   │   ├── notifications/      # Alert system & reminders
│   │   ├── reports/            # PDF/Excel export, dashboards
│   │   ├── reproduction/       # Breeding cycles, pregnancy tracking
│   │   ├── subscriptions/      # Billing & subscription management
│   │   ├── tenants/            # Multi-tenancy (per-farm isolation)
│   │   ├── tickets/            # Support ticket system
│   │   ├── users/              # User roles & permissions
│   │   └── vetassist/          # AI vet assistant (Gemini integration)
│   ├── config/                 # Django settings & URL routing
│   │   ├── settings/           # Base, development, production configs
│   │   ├── celery.py           # Celery app configuration
│   │   ├── urls.py             # API endpoints
│   │   └── wsgi.py             # WSGI entry point
│   ├── templates/              # Django templates (emails, etc.)
│   ├── manage.py               # Django CLI
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile              # Production image
│   └── entrypoint.sh            # Container startup script
│
├── frontend/                   # React + Vite SPA
│   ├── src/
│   │   ├── pages/              # Route-level components
│   │   ├── components/         # Reusable UI components
│   │   ├── api/                # Axios client & API calls
│   │   ├── context/            # React Context for global state
│   │   ├── styles/             # Global CSS/Tailwind config
│   │   ├── App.jsx             # Main app component & routing
│   │   └── main.jsx            # React entry point
│   ├── package.json            # Node.js dependencies
│   ├── vite.config.js          # Vite bundler config
│   ├── tailwind.config.js      # Tailwind CSS customization
│   ├── Dockerfile.dev          # Dev image (Vite HMR)
│   ├── Dockerfile.prod         # Prod image (static build)
│   └── nginx.conf              # Nginx config for SPA routing
│
├── marketing/                  # Static marketing website (dusuq.com)
│   ├── index.html              # Homepage
│   ├── features.html           # Feature showcase
│   ├── about.html              # About page
│   ├── contact.html            # Contact form
│   ├── support.html            # Support & FAQ
│   ├── docs.html               # Documentation
│   ├── vetassist.html          # VetAssist feature page
│   ├── roadmap.html            # Product roadmap
│   ├── css/                    # Stylesheets
│   ├── js/                     # JavaScript (contact form submission to API)
│   ├── blog/                   # Blog posts
│   └── sitemap.xml             # SEO sitemap
│
├── nginx/                      # Reverse proxy configuration
│   ├── nginx.dev.conf          # Development (localhost, no SSL)
│   ├── nginx.prod.conf         # Production (SSL, domain routing)
│   └── nginx.no-ssl.conf       # Production alternative (plain HTTP)
│
├── postgres/                   # Database initialization
│   └── init.sql                # Seed data, triggers, schemas
│
├── scripts/                    # Utility scripts
│   └── backup_db.sh            # Database backup automation
│
├── docker-compose.yml          # Base Compose file (shared services)
├── docker-compose.override.yml # Dev overrides (ports, hot reload)
├── docker-compose.prod.yml     # Production overrides (SSL, volumes)
│
├── .env.example                # Environment variables template
├── LOCAL_SETUP.md              # Local development guide
├── VPS_DEPLOYMENT.md           # Production deployment guide
└── README.md                   # This file
```

### How It Fits Together

1. **Frontend (Vite) → Nginx → Django API**
   - User accesses http://localhost or https://app.dusuq.com
   - Nginx reverse proxy routes to React frontend or Django backend based on path
   - React app makes API calls to `/api/` endpoints (same-origin in production)

2. **Database & Async Tasks**
   - Django connects to PostgreSQL for transactional data
   - Celery workers process async jobs (report generation, email alerts, AI queries)
   - Redis acts as both Celery broker and result backend
   - Celery Beat schedules recurring tasks (daily summaries, health alerts)

3. **Multi-Tenancy**
   - Each farm is a "tenant" with isolated data
   - Requests include `X-Tenant-ID` header (frontend sets automatically after login)
   - All queries filtered by tenant at the database level

4. **External Integrations**
   - Google Gemini API (optional): VetAssist AI features
   - Let's Encrypt SSL certificates: HTTPS in production
   - Marketing site (static HTML) submits contact forms cross-origin to `/api/contact/`

---

## Quick Start

### Prerequisites

- **Docker Desktop** (Windows / macOS / Linux) or Docker Engine + Docker Compose
- **Git**
- **Text editor** (VS Code, PyCharm, etc. — optional for local development)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/urtworkmail/dusuq.git dusuq-erp
   cd dusuq-erp
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set:
   ```env
   SECRET_KEY=your-long-random-string-50-chars
   DB_PASSWORD=your-strong-password
   ```
   
   Generate a Django secret key:
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(50))"
   ```

3. **Start services:**
   ```bash
   docker compose up --build
   ```
   
   First build takes ~3–5 minutes. Services will be ready at:
   - App: http://localhost (Nginx reverse proxy)
   - API Docs: http://localhost/api/docs/
   - Django Admin: http://localhost/django-admin/
   - Frontend (Vite): http://localhost:5173 (hot reload)
   - Backend: http://localhost:8000

4. **Create superuser (first time):**
   ```bash
   docker compose exec backend python manage.py createsuperuser
   ```

5. **Load breed seed data (first time):**
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

6. **Register Celery Beat schedules (first time):**
   ```bash
   docker compose exec backend python manage.py setup_tasks
   ```

7. **Register your first farm:**
   - Go to http://localhost
   - Click **Create an account**
   - Enter farm name and owner details
   - You're logged in immediately

**For detailed local setup:** See [LOCAL_SETUP.md](LOCAL_SETUP.md)

### Production Deployment

Dusuq deploys to a single Ubuntu 22.04 VPS running Docker Compose. Two domains are configured:
- **dusuq.com** (+ www) — Static marketing site
- **app.dusuq.com** — React + Django app

**Minimum VPS specs:** 2 vCPU, 4 GB RAM (DigitalOcean, Hetzner, Linode, AWS EC2 t3.small+)

**Quick deploy:**
1. Point DNS at your VPS (A records for dusuq.com, www.dusuq.com, app.dusuq.com)
2. SSH to VPS and install Docker
3. Clone repo to `/opt/dusuq-erp`
4. Configure `.env` with production values
5. Set up SSL with Certbot
6. Run: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`
7. Create superuser and load seed data
8. Verify at https://app.dusuq.com

**For step-by-step instructions:** See [VPS_DEPLOYMENT.md](VPS_DEPLOYMENT.md)

---

## Features

### Animals Module
- **Profiles:** Unique ID, name, breed, species, DOB, weight tracking
- **Genealogy:** Parent linkage, herd genetics
- **Lifecycle:** Birth/death events, sales/transfers
- **Photos:** Upload and view animal images

### Milk Production
- **Daily Logs:** Volume, quality (fat %, protein %), time recorded
- **Analytics:** Trends over time, per-animal performance
- **Reports:** PDF/Excel export for analysis
- **Alerts:** Automatic notification if production drops below threshold

### Health Management
- **Events:** Illnesses, injuries, treatments
- **Vaccinations:** Schedule, tracking, reminders
- **Veterinary Records:** Treatment details, medication logs
- **Health Reports:** Herd health summary, disease tracking

### Breeding & Reproduction
- **Estrus Cycles:** Track heat dates, AI/mating records
- **Pregnancies:** Expected delivery dates, carry-over notifications
- **Offspring:** Automatic animal creation on birth record
- **Breeding Reports:** Herd statistics, success rates

### Inventory
- **Feed Inventory:** Stock tracking, usage logs
- **Equipment & Supplies:** Asset management
- **Low-stock Alerts:** Automatic notifications

### VetAssist (AI-Powered)
- **Ask a Question:** General veterinary queries answered by Gemini AI
- **Health Forecast:** Predictive alerts based on herd health trends
- **Report & Analyze:** AI-assisted interpretation of health data
- *(Optional: requires Google Gemini API key)*

### Multi-Tenancy & Users
- **Role-based Access:** Owner, manager, worker roles
- **Per-Farm Isolation:** Data is completely separated by tenant
- **User Management:** Add/remove team members

### Reports & Exports
- **Production Summary:** PDF/Excel reports
- **Health Dashboard:** Visual health metrics
- **Custom Exports:** Filter and export any data

### Support System
- **Contact Form:** From marketing site → support inbox
- **Support Tickets:** Track, respond to, resolve customer issues
- **Email Alerts:** Automatic notifications for new tickets

---

## Architecture

### Data Flow (Request → Response)

```
Client Browser
    ↓
Nginx (Reverse Proxy)
    ├─→ /         → React Frontend (static SPA)
    ├─→ /api/*    → Django Backend (REST API)
    ├─→ /media/*  → Media files (images, exports)
    └─→ /static/* → Static CSS/JS (Django admin, API docs)

Django Backend
    ↓
PostgreSQL (Transactional Data)
    ├─ Animals, Health, Milk, Breeding, Inventory
    ├─ Users, Tenants, Subscriptions
    └─ Notifications, Tickets, Reports

Celery Workers (Async Jobs)
    ↓ (triggered by Django views)
    ├─ Generate PDF/Excel reports
    ├─ Send email alerts
    ├─ Query Gemini API (VetAssist)
    └─ Calculate production forecasts

Redis
    ├─ Celery broker (job queue)
    ├─ Celery result backend (job status)
    └─ Caching (optional)

Celery Beat (Scheduler)
    └─ Daily: Run recurring tasks (health summaries, alerts)
```

### Database Schema Highlights

- **Multi-tenant design:** All tables have `tenant_id` foreign key
- **Audit trail:** Created/updated timestamps on all models
- **Relationships:** Animals → Health/Milk/Breeding logs
- **Breed lookups:** Global breed table shared across all tenants

### Key Dependencies

- **Django ORM:** SQLAlchemy alternative, handles all DB queries
- **Celery:** Distributed task queue for async work
- **DRF Spectacular:** Auto-generates Swagger/OpenAPI docs
- **django-filter:** Enables advanced filtering on list endpoints

---

## Development Workflow

### Running Common Commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f celery
docker compose logs -f frontend

# Run Django management commands
docker compose exec backend python manage.py <command>

# Create migrations
docker compose exec backend python manage.py makemigrations

# Run migrations
docker compose exec backend python manage.py migrate

# Open Django shell
docker compose exec backend python manage.py shell

# Stop all services
docker compose down

# Wipe database (careful!)
docker compose down -v
```

### Hot Reload

- **Backend:** Django `runserver` auto-reloads when Python files change
- **Frontend:** Vite HMR (Hot Module Replacement) instantly reloads when files change
- **No container restart needed** for code changes in development

### Code Organization

- **Backend:** Follow Django app structure (models, views, serializers, urls per app)
- **Frontend:** Co-locate components with their styles and hooks
- **API:** REST conventions (GET /animals, POST /animals, PATCH /animals/{id})

### Adding a New Feature

1. **Backend:**
   - Create Django app: `python manage.py startapp feature_name`
   - Define models in `models.py`
   - Create serializers and viewsets in `views.py`
   - Register routes in `config/urls.py`
   - Run migrations: `makemigrations` → `migrate`

2. **Frontend:**
   - Create API client in `src/api/featureApi.js`
   - Create page component in `src/pages/FeaturePage.jsx`
   - Create reusable components in `src/components/`
   - Add route in `src/App.jsx`

3. **Test & Deploy:**
   - Test locally with `docker compose up`
   - Commit and push to main branch
   - Deploy to production (see VPS_DEPLOYMENT.md)

---

## Deployment

### Environment Configuration

**Development (`.env` example):**
```env
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,backend
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

**Production (`.env` example):**
```env
DEBUG=False
ALLOWED_HOSTS=app.dusuq.com,136.114.190.8
CORS_ALLOWED_ORIGINS=https://dusuq.com,https://www.dusuq.com
USE_HTTPS=True
SSL_EMAIL=admin@dusuq.com
```

### Deploying Updates

```bash
cd /opt/dusuq-erp
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --force-recreate
docker compose exec backend python manage.py migrate
```

### Database Backups

Automated daily backups are configured in production. Manual backup:

```bash
/opt/dusuq-erp/scripts/backup_db.sh
```

Restore from backup:
```bash
gunzip -c backups/dairycare_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T db psql -U dairycare dairycare
```

### Monitoring

Check logs for errors:
```bash
docker compose logs backend | grep ERROR
docker compose logs celery | grep ERROR
```

View container status:
```bash
docker compose ps
```

All services except `nginx` should have **no published ports** for security.

---

## Contributing

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/your-feature`
3. **Make changes locally** (test with `docker compose up`)
4. **Commit with clear messages:** `git commit -am "Add feature: ..."`
5. **Push and open a Pull Request**

### Code Standards

- **Python:** Follow PEP 8 (use `black` or `flake8` for linting)
- **JavaScript:** Use ESLint + Prettier
- **Git:** Use conventional commits (feat:, fix:, docs:, etc.)

---

## Support

### Getting Help

- **Docs:** https://dusuq.com/docs
- **Contact:** https://dusuq.com/contact
- **Support Tickets:** https://app.dusuq.com/support
- **Issues:** Open a GitHub issue in this repository

### Optional: VetAssist (AI) Setup

VetAssist requires a Google Gemini API key. It's optional — all other modules work without it.

1. Get a free Gemini API key: https://ai.google.dev
2. Add to `.env`:
   ```env
   GEMINI_API_KEY=your-key-here
   ```
3. Restart backend:
   ```bash
   docker compose restart backend
   ```

If the key is not set, VetAssist endpoints return a `503` with a clear "not configured" message.

---

## License

This project is proprietary. See LICENSE file for details.

---

## Acknowledgments

Built with:
- **Django & DRF** — Industry-standard Python web framework
- **React & Vite** — Modern, fast frontend development
- **PostgreSQL** — Reliable relational database
- **Docker** — Containerized deployment
- **Celery & Redis** — Robust async job processing
- **Google Gemini** — AI-powered veterinary insights

---

**Version:** 1.0.0  
**Last Updated:** July 2026  
**Status:** Production Ready

For the complete local setup guide, see [LOCAL_SETUP.md](LOCAL_SETUP.md).  
For production deployment, see [VPS_DEPLOYMENT.md](VPS_DEPLOYMENT.md).
