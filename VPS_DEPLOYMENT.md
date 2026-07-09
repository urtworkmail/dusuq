# DairyCare — VPS Production Deployment Guide

Tested on: **Ubuntu 22.04 LTS**  
Estimated time: 30–45 minutes

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
git clone <your-repo-url> /opt/dairycare
cd /opt/dairycare

# OR using scp
scp -r ./dairycare user@your-vps-ip:/opt/dairycare
```

---

## 4. Configure environment

```bash
cd /opt/dairycare
cp .env.example .env
nano .env
```

Set these values for production:

```env
SECRET_KEY=<50-char-random-string>
DEBUG=False
DB_PASSWORD=<strong-database-password>
DB_HOST=db
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
DOMAIN=yourdomain.com
SSL_EMAIL=admin@yourdomain.com

REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1
```

---

## 5. Set up SSL with Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot -y

# Temporarily allow port 80 for ACME challenge
# Make sure nginx is NOT running yet

# Get certificates (replace with your domain)
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos \
  --non-interactive

# Certificates saved to: /etc/letsencrypt/live/yourdomain.com/
```

---

## 6. Update the nginx production config

Edit `nginx/nginx.prod.conf` — replace `${DOMAIN}` with your actual domain:

```bash
sed -i 's/${DOMAIN}/yourdomain.com/g' nginx/nginx.prod.conf
```

---

## 7. Build and start production stack

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Wait for all containers to be healthy:

```bash
docker compose ps
```

All containers should show `Up` or `healthy`.

---

## 8. Initial setup (run once)

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

## 9. Verify the deployment

```bash
# Check API health
curl https://yourdomain.com/api/health/

# Expected response:
# {"status": "ok", "db": true}
```

Open **https://yourdomain.com** in your browser — you should see the DairyCare login page.

---

## 10. Auto-renew SSL certificates

```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e
```

Add this line:
```
0 3 * * * certbot renew --quiet && docker compose -f /opt/dairycare/docker-compose.yml -f /opt/dairycare/docker-compose.prod.yml restart nginx
```

---

## 11. Set up automatic database backups

```bash
chmod +x /opt/dairycare/scripts/backup_db.sh
mkdir -p /opt/dairycare/backups

# Test the backup
/opt/dairycare/scripts/backup_db.sh

# Schedule daily backups at 2 AM
crontab -e
```

Add:
```
0 2 * * * /opt/dairycare/scripts/backup_db.sh >> /var/log/dairycare_backup.log 2>&1
```

---

## 12. Deploying updates

```bash
cd /opt/dairycare

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
/opt/dairycare/scripts/backup_db.sh

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
