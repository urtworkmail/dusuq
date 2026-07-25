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
