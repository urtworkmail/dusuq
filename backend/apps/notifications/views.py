from django.utils import timezone
from rest_framework import serializers, generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "notification_type", "title", "message",
            "is_read", "link", "created_at", "read_at",
        ]
        read_only_fields = ["created_at", "read_at"]


class NotificationListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = Notification.objects.filter(
            tenant=self.request.tenant, user=self.request.user
        )
        unread_only = self.request.query_params.get("unread_only")
        if unread_only == "true":
            qs = qs.filter(is_read=False)
        return qs


class MarkReadView(APIView):
    """Mark one or all notifications as read."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        now = timezone.now()
        if pk:
            try:
                notif = Notification.objects.get(
                    pk=pk, user=request.user, tenant=request.tenant
                )
                notif.is_read = True
                notif.read_at = now
                notif.save(update_fields=["is_read", "read_at"])
                return Response({"detail": "Marked as read."})
            except Notification.DoesNotExist:
                return Response({"detail": "Not found."}, status=404)
        else:
            # Mark all unread as read
            Notification.objects.filter(
                user=request.user, tenant=request.tenant, is_read=False
            ).update(is_read=True, read_at=now)
            return Response({"detail": "All notifications marked as read."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_count(request):
    count = Notification.objects.filter(
        tenant=request.tenant, user=request.user, is_read=False
    ).count()
    return Response({"unread_count": count})
