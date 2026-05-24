from app.core.config import settings
from app.providers.openai_compatible import OpenAICompatibleProvider
from typing import Optional

class ProviderRegistry:
    @staticmethod
    def get_provider(provider_name: str, api_key: Optional[str] = None) -> Optional[OpenAICompatibleProvider]:
        if provider_name == "local":
            return OpenAICompatibleProvider(
                base_url=settings.LOCAL_PROVIDER_URL,
                api_key="not-needed"
            )
        elif provider_name == "google":
            key = api_key or settings.GOOGLE_API_KEY
            if not key:
                raise ValueError("Google API key is not set. Please configure it in Settings.")
            return OpenAICompatibleProvider(
                base_url="https://generativelanguage.googleapis.com/v1beta/openai",
                api_key=key
            )
        elif provider_name == "openai":
            key = api_key or settings.OPENAI_API_KEY
            if not key:
                raise ValueError("OpenAI API key is not set. Please configure it in Settings.")
            return OpenAICompatibleProvider(
                base_url="https://api.openai.com/v1",
                api_key=key
            )
        else:
            raise ValueError(f"Unknown provider: {provider_name}")
