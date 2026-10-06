"""
System transactional emails (verification, password reset, new-device
alerts) — deliberately separate from apps/notifications/service.py, which
sends farm alert emails through each *tenant's own* SMTP config (and
silently no-ops if a tenant hasn't set one up). These emails are about the
user's own account security, so they always go out through the platform's
own system email connection (settings.EMAIL_* / DEFAULT_FROM_EMAIL) —
otherwise a brand-new signup with no SMTP configured yet could never
receive their own verification email.
"""
import logging

from celery import shared_task
from django.conf import settings
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags

from .models import VerificationPurpose, VerificationToken

logger = logging.getLogger(__name__)


@shared_task
def _send(to_email, subject, template_name, context):
    """
    Runs on a Celery worker, not the request thread — deliberately, so that
    e.g. ForgotPasswordSerializer.save() does the same cheap amount of work
    (one DB lookup, then an async enqueue) whether or not the email matched
    an account. If this sent synchronously, the extra time spent rendering
    templates and talking to SMTP only on a match would be a timing
    side-channel an attacker could use to enumerate registered emails.
    """
    try:
        html_content = render_to_string(f"emails/{template_name}", context)
        text_content = strip_tags(html_content)
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)
        return True
    except Exception:
        logger.exception("Failed to send %s email to %s", template_name, to_email)
        return False


def send_verification_email(user):
    _, raw = VerificationToken.issue(user, VerificationPurpose.EMAIL_VERIFY, ttl_hours=48)
    link = f"{settings.FRONTEND_URL}/verify-email?token={raw}"
    _send.delay(
        user.email,
        "Verify your email — Dusuq ERP",
        "verify_email.html",
        {"user_name": user.get_full_name(), "link": link},
    )


def send_password_reset_email(user):
    _, raw = VerificationToken.issue(user, VerificationPurpose.PASSWORD_RESET, ttl_hours=1)
    link = f"{settings.FRONTEND_URL}/reset-password?token={raw}"
    _send.delay(
        user.email,
        "Reset your password — Dusuq ERP",
        "password_reset.html",
        {"user_name": user.get_full_name(), "link": link},
    )


def send_new_device_code(user, request):
    """Issues a 6-digit code for a login from an unrecognized browser/device."""
    meta = {
        "device_id": request.data.get("device_id") or "",
        "user_agent": request.META.get("HTTP_USER_AGENT", "")[:255],
        "ip": _client_ip(request),
    }
    token, raw_code = VerificationToken.issue(
        user, VerificationPurpose.NEW_DEVICE, ttl_hours=0.25, meta=meta, code_only=True
    )
    _send.delay(
        user.email,
        "New sign-in to your Dusuq ERP account",
        "new_device_code.html",
        {"user_name": user.get_full_name(), "code": raw_code, "ip": meta["ip"], "user_agent": meta["user_agent"]},
    )
    return token


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
