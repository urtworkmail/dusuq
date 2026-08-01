import threading
from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.exceptions import AuthenticationFailed

_thread_locals = threading.local()


def get_current_user():
    """Read by apps/platform_admin/signals.py to attribute DATA_CHANGED audit
    entries to whoever made the request — Django's post_save signals have no
    access to the request, so this is threaded through instead."""
    return getattr(_thread_locals, "user", None)


class UpdateLastActivityMiddleware:
    """
    Best-effort "who's online" tracking for the platform admin dashboard.
    Does its own lightweight JWT check (independent of TenantMiddleware —
    deliberately not coupled to that security-critical path) and, if the
    request is authenticated, throttles writes to at most once per minute per
    user via a raw .update() (skips signals/save() overhead, avoids a write
    on every single request). Never blocks or alters the request/response —
    purely a side-effect tracker.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_auth = JWTAuthentication()

    def __call__(self, request):
        _thread_locals.user = None
        try:
            auth_result = self.jwt_auth.authenticate(request)
        except (InvalidToken, TokenError, AuthenticationFailed):
            auth_result = None

        if auth_result is not None:
            user, _ = auth_result
            _thread_locals.user = user
            now = timezone.now()
            if user.last_activity is None or (now - user.last_activity).total_seconds() > 60:
                type(user).objects.filter(pk=user.pk).update(last_activity=now)

        try:
            return self.get_response(request)
        finally:
            _thread_locals.user = None
