import uuid
from django.db import models


def _generate_ticket_number():
    return f"TKT-{uuid.uuid4().hex[:8].upper()}"


class TicketStatus(models.TextChoices):
    OPEN = "open", "Open"
    IN_PROGRESS = "in_progress", "In Progress"
    RESOLVED = "resolved", "Resolved"
    CLOSED = "closed", "Closed"


class TicketPriority(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"


class SupportTicket(models.Model):
    """
    A public support ticket. Anyone can open one — no login required — but they
    must identify the organization and the account username the ticket concerns,
    so support staff have enough context to act on it.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket_number = models.CharField(
        max_length=20, unique=True, default=_generate_ticket_number, editable=False
    )

    organization_name = models.CharField(max_length=200)
    account_username = models.CharField(
        max_length=150, help_text="The Dusuq ERP username this ticket concerns"
    )
    email = models.EmailField(help_text="Where to send updates on this ticket")

    subject = models.CharField(max_length=200)
    description = models.TextField()

    status = models.CharField(
        max_length=15, choices=TicketStatus.choices, default=TicketStatus.OPEN
    )
    priority = models.CharField(
        max_length=10, choices=TicketPriority.choices, default=TicketPriority.MEDIUM
    )
    staff_notes = models.TextField(
        blank=True, help_text="Internal notes, not visible on the public status page"
    )

    source_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Support Ticket"
        verbose_name_plural = "Support Tickets"

    def __str__(self):
        return f"{self.ticket_number} — {self.subject}"
