import uuid
from django.db import models


class HerdSize(models.TextChoices):
    UNDER_50 = "under-50", "Under 50 animals"
    RANGE_50_200 = "50-200", "50 – 200 animals"
    RANGE_200_500 = "200-500", "200 – 500 animals"
    OVER_500 = "500-plus", "500+ animals"


class ContactInquiry(models.Model):
    """Submission from the public marketing site contact form."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    email = models.EmailField()
    farm_name = models.CharField(max_length=200, blank=True)
    herd_size = models.CharField(max_length=15, choices=HerdSize.choices, blank=True)
    message = models.TextField()

    is_read = models.BooleanField(default=False)
    source_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Contact Inquiry"
        verbose_name_plural = "Contact Inquiries"

    def __str__(self):
        return f"{self.name} <{self.email}> — {self.created_at:%Y-%m-%d}"
