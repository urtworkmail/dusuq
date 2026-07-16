from django.contrib.auth import get_user_model
from rest_framework import generics, status, permissions, throttling
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    ResetPasswordSerializer,
)
from .permissions import IsTenantOwner, IsSameTenant

User = get_user_model()


class LoginThrottle(throttling.AnonRateThrottle):
    scope = "login"


class RegisterThrottle(throttling.AnonRateThrottle):
    scope = "register"


class TokenRefreshThrottle(throttling.AnonRateThrottle):
    scope = "token_refresh"


class PasswordThrottle(throttling.UserRateThrottle):
    scope = "password"


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginThrottle]


class ThrottledTokenRefreshView(TokenRefreshView):
    throttle_classes = [TokenRefreshThrottle]


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegisterThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, tenant = serializer.save()

        # Issue tokens immediately after registration
        refresh = RefreshToken.for_user(user)
        subscription = getattr(tenant, "subscription", None)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                    "tenant_id": str(tenant.id),
                    "tenant_name": tenant.name,
                },
                "subscription": (
                    {
                        "status": subscription.status,
                        "plan": None,
                        "is_trialing": subscription.is_trialing,
                        "trial_days_left": subscription.trial_days_left,
                        "is_ai_enabled": subscription.is_ai_enabled,
                        "is_access_active": subscription.is_access_active,
                    }
                    if subscription
                    else None
                ),
            },
            status=status.HTTP_201_CREATED,
        )


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Logged out."})
        except Exception:
            return Response({"detail": "Invalid token."}, status=400)


class MeView(generics.RetrieveUpdateAPIView):
    """Current user's own profile."""
    permission_classes = [permissions.IsAuthenticated, IsSameTenant]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [PasswordThrottle]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated."})


class UserListCreateView(generics.ListCreateAPIView):
    """Owner lists and creates users in their farm."""
    permission_classes = [permissions.IsAuthenticated, IsTenantOwner]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        return User.objects.filter(tenant=self.request.tenant).order_by(
            "first_name", "last_name"
        )


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Owner manages a specific user."""
    permission_classes = [permissions.IsAuthenticated, IsTenantOwner]
    serializer_class = UserUpdateSerializer

    def get_queryset(self):
        return User.objects.filter(tenant=self.request.tenant)

    def perform_destroy(self, instance):
        # Soft-deactivate instead of hard delete
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({"detail": "User deactivated."}, status=status.HTTP_200_OK)


class ResetUserPasswordView(APIView):
    """Owner resets another user's password."""
    permission_classes = [permissions.IsAuthenticated, IsTenantOwner]
    throttle_classes = [PasswordThrottle]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = User.objects.get(
                id=serializer.validated_data["user_id"],
                tenant=request.tenant,
            )
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=404)

        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password reset."})
