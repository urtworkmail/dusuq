from django.apps import AppConfig


class PlatformAdminConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.platform_admin"
    verbose_name = "Platform Admin"

    def ready(self):
        from django.db.models.signals import post_save, post_delete, pre_save
        from django.apps import apps as django_apps
        from . import signals

        # Highest-value models for data-change auditing — see signals.py
        # docstring for why this list is deliberately short.
        tracked_models = [
            ("animals", "Animal"),
            ("accounts", "Transaction"),
            ("users", "User"),
        ]
        for app_label, model_name in tracked_models:
            model = django_apps.get_model(app_label, model_name)
            post_save.connect(signals.on_saved, sender=model, dispatch_uid=f"audit_save_{app_label}_{model_name}")
            post_delete.connect(signals.on_deleted, sender=model, dispatch_uid=f"audit_delete_{app_label}_{model_name}")

        subscription_model = django_apps.get_model("subscriptions", "Subscription")
        pre_save.connect(signals.on_subscription_pre_save, sender=subscription_model, dispatch_uid="audit_subscription_pre_save")
        post_save.connect(signals.on_subscription_post_save, sender=subscription_model, dispatch_uid="audit_subscription_post_save")
