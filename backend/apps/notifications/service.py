"""
Central notification service.
Creates in-app notifications and sends emails using per-tenant SMTP config.
"""
import logging
from django.core.mail import get_connection, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from apps.notifications.models import Notification, NotificationType

logger = logging.getLogger(__name__)


def _get_smtp_connection(tenant):
    """Return an email connection using per-tenant SMTP config, or None."""
    try:
        cfg = tenant.smtp_config
        if not cfg.is_verified:
            return None
        return get_connection(
            backend="django.core.mail.backends.smtp.EmailBackend",
            host=cfg.host,
            port=cfg.port,
            username=cfg.username,
            password=cfg.password,
            use_tls=cfg.use_tls,
            use_ssl=cfg.use_ssl,
        )
    except Exception:
        return None


def _from_address(tenant):
    try:
        cfg = tenant.smtp_config
        return f"{cfg.from_name} <{cfg.from_email}>"
    except Exception:
        return "Dusuq ERP <noreply@dusuq.com>"


def create_notification(tenant, user, notif_type, title, message, link="", send_email=True):
    """Create in-app notification and optionally send email."""
    notif = Notification.objects.create(
        tenant=tenant,
        user=user,
        notification_type=notif_type,
        title=title,
        message=message,
        link=link,
    )

    if send_email:
        _send_notification_email(tenant, user, title, message)

    return notif


def _send_notification_email(tenant, user, subject, message):
    """Send email using per-tenant SMTP config."""
    connection = _get_smtp_connection(tenant)
    if not connection:
        logger.debug(
            "No verified SMTP config for tenant %s — skipping email", tenant.id
        )
        return

    try:
        html_content = render_to_string(
            "emails/notification.html",
            {
                "subject": subject,
                "message": message,
                "farm_name": tenant.name,
                "user_name": user.get_full_name(),
            },
        )
        text_content = strip_tags(html_content)

        email = EmailMultiAlternatives(
            subject=f"[{tenant.name}] {subject}",
            body=text_content,
            from_email=_from_address(tenant),
            to=[user.email],
            connection=connection,
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)
        logger.info("Email sent to %s for tenant %s", user.email, tenant.id)
    except Exception as exc:
        logger.error(
            "Failed to send email to %s for tenant %s: %s",
            user.email,
            tenant.id,
            exc,
        )


def broadcast_to_roles(tenant, roles, notif_type, title, message, link=""):
    """Send notification to all active users with specified roles."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    users = User.objects.filter(tenant=tenant, role__in=roles, is_active=True)
    for user in users:
        create_notification(tenant, user, notif_type, title, message, link)
