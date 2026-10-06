from rest_framework.exceptions import APIException


class NewDeviceVerificationRequired(APIException):
    """
    Raised from CustomTokenObtainPairSerializer.validate() when credentials
    are correct but the browser/device is unrecognized — mirrors the shape
    of the subscription_inactive 402 (a `code` field the frontend switches
    on) so the two error-handling paths stay consistent.
    """
    status_code = 401
    default_detail = "We've emailed a code to confirm this new sign-in."
    default_code = "device_verification_required"

    def __init__(self, challenge_id):
        super().__init__(detail={
            "detail": self.default_detail,
            "code": self.default_code,
            "challenge_id": str(challenge_id),
        })
