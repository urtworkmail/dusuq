from decimal import Decimal

from django.conf import settings

from .models import AIUsageRecord


def record_ai_usage(tenant, user, kind, model_name, input_tokens, output_tokens):
    """
    Computes the actual Gemini API cost for one call from real token counts,
    and stores it with our surcharge applied — the single source of truth for
    AI billing, whether that ends up auto-metered (Stripe) or invoiced
    manually (PayFast).
    """
    input_cost = (Decimal(input_tokens) / Decimal("1000000")) * Decimal(
        str(settings.GEMINI_INPUT_COST_PER_1M_TOKENS)
    )
    output_cost = (Decimal(output_tokens) / Decimal("1000000")) * Decimal(
        str(settings.GEMINI_OUTPUT_COST_PER_1M_TOKENS)
    )
    api_cost = (input_cost + output_cost).quantize(Decimal("0.000001"))

    return AIUsageRecord.objects.create(
        tenant=tenant,
        user=user,
        kind=kind,
        model_name=model_name,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        api_cost_usd=api_cost,
        surcharge_percent=Decimal(str(settings.AI_USAGE_SURCHARGE_PERCENT)),
    )
