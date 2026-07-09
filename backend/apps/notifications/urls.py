from django.urls import path
from . import views

urlpatterns = [
    path("", views.NotificationListView.as_view(), name="notification-list"),
    path("unread-count/", views.unread_count, name="notification-unread-count"),
    path("mark-read/", views.MarkReadView.as_view(), name="mark-all-read"),
    path("<int:pk>/mark-read/", views.MarkReadView.as_view(), name="mark-one-read"),
]
