"""
Thin wrapper around the Gemini API. All prompt construction lives here so the
rest of the app deals in plain Python data, not model-specific request shapes.
"""
import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """You are VetAssist, a highly intelligent system inside Dusuq ERP, a dairy farm \
management platform. You help vets and farm owners understand their animals better.

Rules:
- Always ground your answer in the FARM DATA provided below first. Reference specific values \
(dates, litres, drug names, amounts) from the data when relevant.
- Only fall back on general veterinary, nutrition, or dairy-industry knowledge when the farm data \
does not contain the answer, or when the user is explicitly asking for research (diet plans, \
treatment strategies, disease information). Clearly signal when you are doing this, e.g. \
"Based on general veterinary guidance..." rather than presenting it as farm data.
- Be concise and specific. Prefer numbers and named entities over vague statements.
- You are a decision-support tool, not a replacement for a licensed veterinarian. For any specific \
treatment or drug dosage recommendation, note that a vet should confirm before acting on it.
- Never reference or imply access to any farm other than the one whose data is provided.
"""


def _get_model():
    import google.generativeai as genai

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. Set it in the environment to enable VetAssist."
        )
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        system_instruction=SYSTEM_INSTRUCTION,
    )


def _build_prompt(question, context, allow_research):
    return (
        f"FARM DATA (JSON, this farm only):\n{json.dumps(context, default=str, indent=2)}\n\n"
        f"EXTERNAL RESEARCH ALLOWED: {allow_research}\n\n"
        f"QUESTION:\n{question}\n"
    )


def ask(question, context, allow_research=True):
    """
    Send a question plus its farm-data context to Gemini and return the answer text.
    Raises RuntimeError if GEMINI_API_KEY isn't configured.
    """
    model = _get_model()
    prompt = _build_prompt(question, context, allow_research)
    try:
        response = model.generate_content(prompt)
        return (response.text or "").strip()
    except Exception:
        logger.exception("VetAssist Gemini request failed")
        raise


def generate_report(context, entity_label, include_research):
    question = (
        f"Generate a detailed, personalized report on {entity_label}. Summarize its current "
        "status, recent history, and anything that needs attention. "
        + (
            "If the data shows a need (declining trend, recent health event, unusual pattern), "
            "include a researched diet plan or treatment strategy recommendation, clearly labeled "
            "as researched guidance rather than farm data."
            if include_research
            else "Do not include external research — base the report only on the farm data provided."
        )
    )
    return ask(question, context, allow_research=include_research)


def generate_forecast(context, metric_label, scope_label, horizon_days):
    question = (
        f"Using the farm data provided, produce a {horizon_days}-day forecast and historical "
        f"analysis for {metric_label} at the {scope_label} level. Note the trend direction, "
        "the main drivers you can see in the data, and a numeric estimate where the data supports one."
    )
    return ask(question, context, allow_research=False)
