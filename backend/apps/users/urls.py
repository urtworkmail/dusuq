from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("token/refresh/", views.ThrottledTokenRefreshView.as_view(), name="token-refresh"),

    path("me/", views.MeView.as_view(), name="me"),
    path("me/change-password/", views.ChangePasswordView.as_view(), name="change-password"),

    path("verify-email/", views.VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", views.ResendVerificationView.as_view(), name="resend-verification"),
    path("forgot-password/", views.ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password-confirm/", views.PasswordResetConfirmView.as_view(), name="reset-password-confirm"),
    path("verify-device/", views.VerifyDeviceView.as_view(), name="verify-device"),

    path("users/", views.UserListCreateView.as_view(), name="user-list"),
    path("users/<uuid:pk>/", views.UserDetailView.as_view(), name="user-detail"),
    path("users/reset-password/", views.ResetUserPasswordView.as_view(), name="reset-password"),
]
