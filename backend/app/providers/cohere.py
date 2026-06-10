import json
import httpx
from typing import AsyncGenerator, List, Dict, Any
from app.providers.base import BaseProvider

class CohereProvider(BaseProvider):
    """
    Native HTTP adapter for Cohere Chat v2 API.
    Avoids using external heavy libraries by wrapping standard HTTP requests.
    """
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.cohere.com/v2"

    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def _transform_messages(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extracts messages into Cohere format."""
        transformed = []
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content")
            
            # Map system prompts or normal dialogue roles
            if role in ("system", "user", "assistant"):
                transformed.append({
                    "role": role,
                    "content": {
                        "type": "text",
                        "text": content or " "
                    }
                })
        return transformed

    async def generate(self, messages: List[Dict[str, Any]], model: str, **kwargs) -> str:
        payload = {
            "model": model,
            "messages": self._transform_messages(messages),
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/chat",
                headers=self._get_headers(),
                json=payload,
                timeout=60.0
            )
            resp.raise_for_status()
            data = resp.json()
            try:
                # Cohere v2 format: message.content[0].text
                return data["message"]["content"][0]["text"]
            except (KeyError, IndexError):
                return ""

    async def stream(self, messages: List[Dict[str, Any]], model: str, **kwargs) -> AsyncGenerator[str, None]:
        payload = {
            "model": model,
            "messages": self._transform_messages(messages),
            "stream": True
        }
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat",
                headers=self._get_headers(),
                json=payload,
                timeout=60.0
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            # Cohere streams line-by-line JSON objects
                            data = json.loads(line)
                            event_type = data.get("type")
                            
                            # Content chunks
                            if event_type == "content-delta":
                                text = data.get("delta", {}).get("message", {}).get("content", {}).get("text", "")
                                if text:
                                    yield text
                        except json.JSONDecodeError:
                            continue

    async def get_models(self) -> List[str]:
        return [
            "command-r-plus",
            "command-r",
            "command-light"
        ]
