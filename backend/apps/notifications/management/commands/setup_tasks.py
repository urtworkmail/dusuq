from django.core.management.base import BaseCommand
from apps.notifications.schedule import setup_periodic_tasks


class Command(BaseCommand):
    help = "Register Celery Beat periodic tasks in the database."

    def handle(self, *args, **kwargs):
        setup_periodic_tasks()
        self.stdout.write(self.style.SUCCESS("Periodic tasks registered."))
