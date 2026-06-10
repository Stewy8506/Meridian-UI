from app.core.config import settings
from typing import Optional, List, Dict, Any
from app.providers.provider_configs import PROVIDERS_CONFIG, ProviderConfig
from app.providers.openai_compatible import OpenAICompatibleProvider
from app.providers.anthropic import AnthropicProvider
from app.providers.cohere import CohereProvider
from app.providers.azure_openai import AzureOpenAIProvider
from app.providers.bedrock import BedrockProvider

class ProviderRegistry:
    @staticmethod
    def get_provider(provider_name: str, api_key: Optional[str] = None, base_url: Optional[str] = None) -> Any:
        provider_name = provider_name.strip().lower()
        if provider_name not in PROVIDERS_CONFIG:
            raise ValueError(f"Unknown provider: '{provider_name}'")

        config = PROVIDERS_CONFIG[provider_name]
        
        # Get key from parameters, or look up environment variables in settings
        key = api_key
        if not key:
            key_env_var = config.api_key_env
            key = getattr(settings, key_env_var, None)

        if not key and provider_name not in ("local", "ollama"):
            raise ValueError(f"API Key for provider '{config.name}' is not set. Please configure it in Settings.")

        if config.adapter == "openai_compatible":
            url = base_url or config.base_url
            # For local providers, api_key is not needed
            final_key = key or "not-needed"
            
            # If Ollama, check if base_url is locally running or custom
            return OpenAICompatibleProvider(
                base_url=url,
                api_key=final_key
            )
        elif config.adapter == "anthropic":
            return AnthropicProvider(api_key=key)
        elif config.adapter == "cohere":
            return CohereProvider(api_key=key)
        elif config.adapter == "azure":
            url = base_url or config.base_url
            return AzureOpenAIProvider(api_key=key, base_url=url)
        elif config.adapter == "bedrock":
            # Bedrock parses composite key string format: access_key:secret_key:region
            key_id, secret, region = None, None, "us-east-1"
            if key:
                if ":" in key:
                    parts = key.split(":")
                    if len(parts) >= 2:
                        key_id = parts[0]
                        secret = parts[1]
                    if len(parts) >= 3:
                        region = parts[2]
                else:
                    key_id = key
                    secret = key
            return BedrockProvider(
                aws_access_key_id=key_id,
                aws_secret_access_key=secret,
                region_name=region
            )
        else:
            raise ValueError(f"Adapter type '{config.adapter}' not supported.")

    @staticmethod
    def list_available(user_keys: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        """List all providers with configured status flags."""
        result = []
        user_keys = user_keys or {}
        for pid, config in PROVIDERS_CONFIG.items():
            # Check if API key exists in user credentials or backend environment configs
            has_key = (
                pid in ("local", "ollama") or
                pid in user_keys or
                getattr(settings, config.api_key_env, None) is not None
            )
            result.append({
                "id": config.id,
                "name": config.name,
                "icon": config.icon,
                "adapter": config.adapter,
                "configured": has_key,
                "default_model": config.default_model
            })
        return result
