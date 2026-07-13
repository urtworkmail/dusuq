from .base import *
import environ

env = environ.Env()

DEBUG = False

# "localhost" is always included — the Dockerfile's own HEALTHCHECK curls
# http://localhost:8000/api/health/ from inside the container, and without it
# in ALLOWED_HOSTS that probe gets a 400 and the container shows unhealthy
# forever regardless of what's configured for the outside world.
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[]) + ["localhost"]

# CORS — restrict to the marketing site's origin(s) in production. The app itself
# (erp.dusuq.com) doesn't need to be listed here — its requests to its own /api/ are
# same-origin. This is for cross-origin calls from the marketing site (dusuq.com).
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])

# Required for Django admin / CSRF-protected POSTs to work behind the nginx reverse
# proxy — must include the scheme, e.g. https://erp.dusuq.com
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

# nginx terminates TLS and forwards X-Forwarded-Proto; without this, Django can't
# tell the original request was HTTPS and SECURE_SSL_REDIRECT below causes a
# redirect loop.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Set USE_HTTPS=False in .env to run over plain HTTP — e.g. testing by IP before
# DNS/a cert exist. Every setting below that forces or assumes HTTPS is gated on
# this so nothing redirect-loops or silently drops cookies over plain HTTP.
USE_HTTPS = env.bool("USE_HTTPS", default=True)

# Security hardening
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = 31536000 if USE_HTTPS else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = USE_HTTPS
SECURE_HSTS_PRELOAD = USE_HTTPS
SECURE_SSL_REDIRECT = USE_HTTPS
SESSION_COOKIE_SECURE = USE_HTTPS
CSRF_COOKIE_SECURE = USE_HTTPS

# Use real SMTP (configured per-tenant; this is the system default)
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": '{"time": "%(asctime)s", "level": "%(levelname)s", "module": "%(module)s", "message": "%(message)s"}',
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "root": {"handlers": ["console"], "level": "WARNING"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "apps": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
