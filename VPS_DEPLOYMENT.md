# Dusuq ERP — VPS Production Deployment Guide

Tested on: **Ubuntu 22.04 LTS**  
Estimated time: 30–45 minutes

This deploys two domains from one stack:
- **dusuq.com** (+ www) — the static marketing site
- **erp.dusuq.com** — the app (React frontend + Django API)

`nginx/nginx.prod.conf` is already configured for exactly these two hostnames — no
templating step needed. If you're deploying to different domains, edit that file
directly (`server_name` and `ssl_certificate` paths in each block) instead of the
old `${DOMAIN}` substitution this guide used previously.

---

## 0. Point DNS at the VPS

Before anything else, create these DNS records at your registrar (or wherever
dusuq.com is managed), pointing at your VPS's public IP:

| Type | Host | Value |
|------|------|-------|
| A | `dusuq.com` (or `@`) | `<vps-ip>` |
| A | `www.dusuq.com` | `<vps-ip>` |
| A | `erp.dusuq.com` | `<vps-ip>` |

DNS propagation can take a few minutes to a few hours. Certbot (step 5) will fail
until these resolve — check with `dig +short erp.dusuq.com` before proceeding.

---

## 1. Provision your VPS

Minimum specs:
- 2 vCPU, 4 GB RAM (DigitalOcean, Hetzner, Linode, AWS EC2 t3.small+)
- Ubuntu 22.04 LTS
- Open firewall ports: **22** (SSH), **80** (HTTP), **443** (HTTPS)

---

## 2. Install Docker on the VPS

SSH into your server, then:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add your user to the docker group (no sudo needed)
sudo usermod -aG docker $USER

# Apply group change
newgrp docker

# Verify
docker --version
docker compose version
```

---

## 3. Upload the project

From your local machine:

```bash
# Using git (recommended)
ssh user@your-vps-ip
git clone <your-repo-url> /opt/dusuq-erp
cd /opt/dusuq-erp

# OR using scp
scp -r ./dusuq-erp user@your-vps-ip:/opt/dusuq-erp
```

---

## 4. Configure environment

```bash
cd /opt/dusuq-erp
cp .env.example .env
nano .env
```

Set these values for production:

```env
SECRET_KEY=<50-char-random-string>
DEBUG=False
DB_PASSWORD=<strong-database-password>
DB_HOST=db

# The app's own host — not the marketing domain
ALLOWED_HOSTS=erp.dusuq.com

# The marketing site is a different origin and calls the API cross-origin
# (contact form, support tickets) — it needs to be CORS-allowed explicitly.
CORS_ALLOWED_ORIGINS=https://dusuq.com,https://www.dusuq.com

# Needed for Django admin logins to work behind the reverse proxy
CSRF_TRUSTED_ORIGINS=https://erp.dusuq.com

# Baked into the React build — same origin as the app itself
VITE_API_URL=https://erp.dusuq.com

SSL_EMAIL=admin@dusuq.com

REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

GEMINI_API_KEY=<your-gemini-api-key>
```

---

## 5. Set up SSL with Let's Encrypt (Certbot)

One certificate covering all three hostnames — nginx.prod.conf references it as
`/etc/letsencrypt/live/dusuq.com/` (the first `-d` flag becomes the certificate's
directory name) from both the marketing and app server blocks.

```bash
# Install Certbot
sudo apt install certbot -y

# Make sure nginx is NOT running yet — port 80 must be free for the ACME challenge
sudo certbot certonly --standalone \
  -d dusuq.com \
  -d www.dusuq.com \
  -d erp.dusuq.com \
  --email admin@dusuq.com \
  --agree-tos \
  --non-interactive

# Certificate saved to: /etc/letsencrypt/live/dusuq.com/
```

---

## 6. Build and start production stack

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Wait for all containers to be healthy:

```bash
docker compose ps
```

All containers should show `Up` or `healthy`.

---

## 7. Initial setup (run once)

```bash
# Create Django superuser
docker compose exec backend python manage.py createsuperuser

# Load global breed data
docker compose exec backend python manage.py shell -c "
from apps.tenants.models import Breed
breeds = [
  ('Holstein Friesian','cattle'),('Jersey','cattle'),('Brown Swiss','cattle'),
  ('Sahiwal','cattle'),('Gir','cattle'),('Crossbred','cattle'),
  ('Nili-Ravi','buffalo'),('Murrah','buffalo'),
  ('Beetal','goat'),('Teddy','goat'),
]
for name, species in breeds:
  Breed.objects.get_or_create(name=name, species=species, defaults={'is_global': True})
print('Done.')
"

# Register Celery Beat schedules
docker compose exec backend python manage.py setup_tasks
```

---

## 8. Verify the deployment

```bash
# Check API health (via the app domain)
curl https://erp.dusuq.com/api/health/

# Expected response:
# {"status": "ok", "db": true}

# Check the marketing site
curl -I https://dusuq.com/
```

Open **https://erp.dusuq.com** in your browser — you should see the Dusuq ERP login page.
Open **https://dusuq.com** — you should see the marketing site. Submit the contact
form or a support ticket there to confirm the cross-origin call to erp.dusuq.com
works (check `docker compose logs backend` if it doesn't — usually a CORS/env
mismatch, see step 4).

---

## 9. Auto-renew SSL certificates

```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e
```

Add this line:
```
0 3 * * * certbot renew --quiet && docker compose -f /opt/dusuq-erp/docker-compose.yml -f /opt/dusuq-erp/docker-compose.prod.yml restart nginx
```

---

## 10. Set up automatic database backups

```bash
chmod +x /opt/dusuq-erp/scripts/backup_db.sh
mkdir -p /opt/dusuq-erp/backups

# Test the backup
/opt/dusuq-erp/scripts/backup_db.sh

# Schedule daily backups at 2 AM
crontab -e
```

Add:
```
0 2 * * * /opt/dusuq-erp/scripts/backup_db.sh >> /var/log/dusuq_erp_backup.log 2>&1
```

---

## 11. Deploying updates

```bash
cd /opt/dusuq-erp

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Run any new migrations
docker compose exec backend python manage.py migrate
```

---

## Useful production commands

```bash
# View live logs
docker compose logs -f backend
docker compose logs -f celery

# Check container status
docker compose ps

# Restart a single service
docker compose restart backend

# Open Django shell in production
docker compose exec backend python manage.py shell

# Manual database backup
/opt/dusuq-erp/scripts/backup_db.sh

# Restore from backup
gunzip -c backups/dairycare_20260101_020000.sql.gz | \
  docker compose exec -T db psql -U dairycare dairycare
```

---

## Monitoring

Check these logs regularly:
```bash
# Application errors
docker compose logs backend | grep ERROR

# Celery task failures  
docker compose logs celery | grep ERROR

# Nginx access log
docker compose logs nginx
```

---

## Security checklist

- [ ] `DEBUG=False` in `.env`
- [ ] Strong unique `SECRET_KEY`
- [ ] Strong `DB_PASSWORD`
- [ ] SSL certificate active (`https://` works)
- [ ] Firewall allows only 22, 80, 443
- [ ] Daily database backups scheduled
- [ ] `.env` file not in git (`.gitignore` handles this)
