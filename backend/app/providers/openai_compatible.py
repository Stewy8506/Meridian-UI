import json
import httpx
from typing import AsyncGenerator, List, Dict, Any
from app.providers.base import BaseProvider

class OpenAICompatibleProvider(BaseProvider):
    """
    Provider for any API that is compatible with the OpenAI Chat Completions format.
    Works for LM Studio, Ollama (with openai compatibility), and Google AI Studio's OpenAI endpoint.
    """
    
    def __init__(self, base_url: str, api_key: str = "not-needed"):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        
    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def generate(self, messages: List[Dict[str, Any]], model: str, **kwargs) -> str:
        clean_model = model.replace("models/", "") if model.startswith("models/") else model
        async with httpx.AsyncClient() as client:
            payload = {
                "model": clean_model,
                "messages": messages,
                "stream": False,
                **kwargs
            }
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self._get_headers(),
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def stream(self, messages: List[Dict[str, Any]], model: str, **kwargs) -> AsyncGenerator[str, None]:
        clean_model = model.replace("models/", "") if model.startswith("models/") else model
        async with httpx.AsyncClient() as client:
            payload = {
                "model": clean_model,
                "messages": messages,
                "stream": True,
                **kwargs
            }
            async with client.stream(
                "POST", 
                f"{self.base_url}/chat/completions", 
                headers=self._get_headers(), 
                json=payload,
                timeout=60.0
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: ") and line != "data: [DONE]":
                        data_str = line[6:]
                        try:
                            data = json.loads(data_str)
                            content = data["choices"][0]["delta"].get("content")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue

    async def get_models(self) -> List[str]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/models",
                headers=self._get_headers(),
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            
            models = []
            exclude_keywords = ["embedding", "imagen", "veo", "whisper", "tts", "dall-e", "clip", "aqa", "robotics", "moderation", "edit"]
            for model in data.get("data", []):
                model_id = model.get("id")
                if not model_id:
                    continue
                # Strip 'models/' prefix if present
                clean_id = model_id.replace("models/", "") if model_id.startswith("models/") else model_id
                
                # Check if it should be excluded (non-chat models)
                if any(kw in clean_id.lower() for kw in exclude_keywords):
                    continue
                    
                models.append(clean_id)
            return models


