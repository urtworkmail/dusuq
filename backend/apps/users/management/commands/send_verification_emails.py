from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.users.emails import send_verification_email

User = get_user_model()


class Command(BaseCommand):
    """
    One-time rollout helper: marks existing active users as unverified (so the
    new mandatory email-verification gate applies to them too) and sends each
    one a verification email.

    Defaults to a dry run — pass --apply to actually flip is_email_verified
    and send mail. This locks every affected user out of the app (per the
    EMAIL_VERIFICATION_EXEMPT_PATHS gate in TenantMiddleware) until they click
    the link in their email, so only run --apply once EMAIL_HOST/EMAIL_HOST_USER/
    EMAIL_HOST_PASSWORD are configured with working SMTP credentials — verify
    with --apply --limit 1 against a throwaway/own account first.
    """

    help = "Mark existing users unverified and send them a verification email."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Actually do it (default is dry-run).")
        parser.add_argument("--limit", type=int, default=None, help="Only process the first N users.")

    def handle(self, *args, **options):
        apply = options["apply"]
        limit = options["limit"]

        queryset = User.objects.filter(is_active=True, is_email_verified=True).order_by("date_joined")
        if limit:
            queryset = queryset[:limit]

        users = list(queryset)
        if not users:
            self.stdout.write("No verified active users to process.")
            return

        self.stdout.write(f"{'Applying to' if apply else 'Would process'} {len(users)} user(s):")

        sent, failed = 0, 0
        for user in users:
            self.stdout.write(f"  - {user.email}")
            if not apply:
                continue
            user.is_email_verified = False
            user.save(update_fields=["is_email_verified"])
            if send_verification_email(user):
                sent += 1
            else:
                failed += 1

        if not apply:
            self.stdout.write(self.style.WARNING("Dry run only — re-run with --apply to send emails."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Sent {sent}, failed {failed}."))
