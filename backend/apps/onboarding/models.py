from django.db import models


class TenantOnboarding(models.Model):
    """
    One row per tenant, tracking the two things about onboarding that can't
    be derived from other tables: whether the guided product tour has been
    shown, and whether the farm dismissed the checklist widget early. The
    checklist *items themselves* are always computed live from real data
    (see apps.onboarding.views.build_checklist) so they can never drift out
    of sync with what the farm has actually done.
    """
    tenant = models.OneToOneField(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="onboarding"
    )
    tour_completed = models.BooleanField(default=False)
    checklist_dismissed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Onboarding for {self.tenant.name}"
