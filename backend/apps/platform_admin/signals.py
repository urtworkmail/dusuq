"""
Data-change audit logging for the highest-value models first (Animal,
Transaction, User) rather than every model in the system — logging every
milk entry or every treatment would flood the audit log with noise for
little value. Extend `connect_signals()` in apps.py with more models as
needed. Connected lazily in AppConfig.ready() (via apps.get_model) rather
than decorator-style @receiver(sender=...) imports, since those models live
in other apps and importing them directly here at module load time risks
circular imports during Django's app-loading sequence.
"""
from .models import AuditAction
from .middleware import get_current_user


def _log_data_change(sender, instance, action_word):
    from .audit import _log
    user = get_current_user()
    tenant = getattr(instance, "tenant", None)
    _log(
        AuditAction.DATA_CHANGED,
        tenant=tenant,
        user=user,
        target_model=sender.__name__,
        target_id=instance.pk,
        description=f"{sender.__name__} {action_word} (id={instance.pk})" + (f" by {user.email}" if user else ""),
    )


def on_saved(sender, instance, created, **kwargs):
    # User creation (signup) is already logged explicitly via audit.log_signup()
    # with richer context — skip it here to avoid a duplicate, noisier entry.
    if created and sender.__name__ == "User":
        return
    _log_data_change(sender, instance, "created" if created else "updated")


def on_deleted(sender, instance, **kwargs):
    _log_data_change(sender, instance, "deleted")


def on_subscription_pre_save(sender, instance, **kwargs):
    """
    Stashes the pre-update status/period_end on the instance so post_save can
    tell a fresh purchase (status → active for the first time) apart from a
    renewal (already active, period extended) — Django signals don't hand you
    the "before" state directly. No purchase/billing flow exists yet (see
    subscriptions app), but this makes the audit trail correct automatically
    the moment one is built, without needing to touch this file again.
    """
    if instance.pk:
        try:
            previous = sender.objects.only("status", "current_period_end").get(pk=instance.pk)
            instance._previous_status = previous.status
            instance._previous_period_end = previous.current_period_end
            return
        except sender.DoesNotExist:
            pass
    instance._previous_status = None
    instance._previous_period_end = None


def on_subscription_post_save(sender, instance, created, **kwargs):
    from .audit import log_subscription_purchased, log_subscription_renewed

    if created:
        return  # the initial trial Subscription row isn't a "purchase"

    previous_status = getattr(instance, "_previous_status", None)
    previous_period_end = getattr(instance, "_previous_period_end", None)

    if previous_status != "active" and instance.status == "active":
        log_subscription_purchased(instance)
    elif (
        previous_status == "active"
        and instance.status == "active"
        and previous_period_end != instance.current_period_end
    ):
        log_subscription_renewed(instance)
