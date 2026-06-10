from app.providers.openai_compatible import OpenAICompatibleProvider
from typing import List

class AzureOpenAIProvider(OpenAICompatibleProvider):
    """
    Subclasses OpenAICompatibleProvider to route completions through 
    Azure OpenAI's resource-deployment endpoint formats.
    """
    def __init__(self, api_key: str, base_url: str = None, api_version: str = "2024-02-15-preview"):
        url = base_url.rstrip("/") if base_url else "https://my-azure-resource.openai.azure.com"
        super().__init__(base_url=url, api_key=api_key)
        self.api_version = api_version

    def _get_headers(self) -> dict:
        return {
            "api-key": self.api_key,
            "Content-Type": "application/json"
        }

    def _get_url(self, model: str) -> str:
        return f"{self.base_url}/openai/deployments/{model}/chat/completions?api-version={self.api_version}"

    async def get_models(self) -> List[str]:
        return ["gpt-35-turbo", "gpt-4", "gpt-4-turbo", "gpt-4o"]
