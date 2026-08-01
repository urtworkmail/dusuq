"""
Thin helper functions for writing AuditLog entries from other apps — keeps
the actual model/field details out of unrelated call sites (users, subscriptions).
Failures here must never break the caller's real operation (a signup or login
succeeding is far more important than the audit row), so every entry point
swallows exceptions.
"""
import logging
from .models import AuditLog, AuditAction

logger = logging.getLogger(__name__)


def _get_ip(request):
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _log(action, tenant=None, user=None, target_model="", target_id="", description="", request=None):
    try:
        AuditLog.objects.create(
            tenant=tenant,
            user=user,
            action=action,
            target_model=target_model,
            target_id=str(target_id) if target_id else "",
            description=description[:500],
            ip_address=_get_ip(request),
        )
    except Exception:
        logger.exception("Failed to write audit log entry (action=%s)", action)


def log_signup(user, tenant, request=None):
    _log(AuditAction.SIGNUP, tenant=tenant, user=user,
         description=f"{user.email} signed up", request=request)
    _log(AuditAction.FARM_CREATED, tenant=tenant, user=user,
         target_model="Tenant", target_id=tenant.id,
         description=f"Farm '{tenant.name}' created by {user.email}", request=request)


def log_subscription_purchased(subscription, request=None):
    _log(AuditAction.SUBSCRIPTION_PURCHASED, tenant=subscription.tenant,
         target_model="Subscription", target_id=subscription.id,
         description=f"{subscription.tenant.name} subscribed to {subscription.plan}", request=request)


def log_subscription_renewed(subscription, request=None):
    _log(AuditAction.SUBSCRIPTION_RENEWED, tenant=subscription.tenant,
         target_model="Subscription", target_id=subscription.id,
         description=f"{subscription.tenant.name} renewed {subscription.plan}", request=request)


def log_login(user, request=None):
    _log(AuditAction.LOGIN, tenant=user.tenant, user=user,
         description=f"{user.email} logged in", request=request)


def log_logout(user, request=None):
    _log(AuditAction.LOGOUT, tenant=user.tenant if user else None, user=user,
         description=f"{user.email} logged out" if user else "Logout", request=request)
