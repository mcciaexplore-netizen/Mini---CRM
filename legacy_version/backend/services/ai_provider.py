from datetime import date
from sqlalchemy.orm import Session
from backend.models import ApiKey
from backend.services.providers.gemini import GeminiProvider
from backend.services.providers.groq import GroqProvider
from backend.services.providers.mistral import MistralProvider
from backend.services.providers.cohere import CohereProvider
from backend.services.providers.openai_provider import OpenAIProvider

PROVIDER_MAP = {
    "gemini": GeminiProvider,
    "groq": GroqProvider,
    "mistral": MistralProvider,
    "cohere": CohereProvider,
    "openai": OpenAIProvider,
}


class AllProvidersExhausted(Exception):
    pass


async def generate(prompt: str, db: Session) -> str:
    """Try each active API key in priority order. Falls back on rate-limit errors."""
    today = date.today()
    keys = (
        db.query(ApiKey)
        .filter(ApiKey.is_active == True)
        .order_by(ApiKey.priority)
        .all()
    )

    if not keys:
        raise AllProvidersExhausted(
            "No active API keys found. Please add at least one API key in Settings."
        )

    last_error = None
    for key_row in keys:
        # Reset daily counter if it's a new day
        if key_row.last_reset_date != today:
            key_row.calls_today = 0
            key_row.last_reset_date = today
            db.commit()

        provider_cls = PROVIDER_MAP.get(key_row.provider)
        if not provider_cls:
            continue

        provider = provider_cls(api_key=key_row.api_key)
        try:
            result = await provider.complete(prompt)
            key_row.calls_today += 1
            key_row.calls_month += 1
            db.commit()
            return result
        except Exception as e:
            error_str = str(e).lower()
            # Rate-limit or quota errors — try next key
            if any(word in error_str for word in ["429", "rate limit", "quota", "resource_exhausted", "too many"]):
                last_error = e
                continue
            # Other errors bubble up
            raise e

    raise AllProvidersExhausted(
        f"All API keys exhausted or rate-limited. Last error: {last_error}"
    )
