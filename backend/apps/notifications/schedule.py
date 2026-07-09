"""
Run once after first migration to register the beat schedule in the DB.
Called from a Django management command or can be run via shell.
"""
from django_celery_beat.models import PeriodicTask, CrontabSchedule
import json


def setup_periodic_tasks():
    # Daily at 06:00 UTC
    schedule, _ = CrontabSchedule.objects.get_or_create(
        minute="0", hour="6", day_of_week="*",
        day_of_month="*", month_of_year="*",
    )
    PeriodicTask.objects.update_or_create(
        name="Daily Farm Alerts",
        defaults={
            "crontab": schedule,
            "task": "apps.notifications.tasks.run_daily_alerts",
            "args": json.dumps([]),
            "enabled": True,
        },
    )
    print("Periodic tasks registered.")
