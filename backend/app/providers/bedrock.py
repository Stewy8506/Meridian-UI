import json
import asyncio
from typing import AsyncGenerator, List, Dict, Any
from app.providers.base import BaseProvider

class BedrockProvider(BaseProvider):
    """
    HTTP/SDK adapter for AWS Bedrock Runtime.
    Imports boto3 lazily to avoid forcing AWS dependencies on local-only developers.
    Runs boto3 synchronous calls in asyncio threads.
    """
    def __init__(self, aws_access_key_id: Optional[str] = None, aws_secret_access_key: Optional[str] = None, region_name: str = "us-east-1"):
        self.aws_access_key_id = aws_access_key_id
        self.aws_secret_access_key = aws_secret_access_key
        self.region_name = region_name

    def _get_client(self):
        try:
            import boto3
        except ImportError:
            raise ValueError("AWS SDK 'boto3' is not installed. Run 'pip install boto3' to use AWS Bedrock.")
        
        params = {"region_name": self.region_name}
        if self.aws_access_key_id and self.aws_access_key_id != "not-needed":
            params["aws_access_key_id"] = self.aws_access_key_id
        if self.aws_secret_access_key and self.aws_secret_access_key != "not-needed":
            params["aws_secret_access_key"] = self.aws_secret_access_key
            
        return boto3.client("bedrock-runtime", **params)

    def _transform_messages(self, messages: List[Dict[str, Any]]) -> tuple[Optional[str], List[Dict[str, Any]]]:
        system_prompt = None
        transformed = []
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content")
            if role == "system":
                system_prompt = content
            elif role in ("user", "assistant"):
                transformed.append({
                    "role": role,
                    "content": content or " "
                })
        return system_prompt, transformed

    async def generate(self, messages: List[Dict[str, Any]], model: str, **kwargs) -> str:
        client = self._get_client()
        system_prompt, api_messages = self._transform_messages(messages)
        
        payload = {
            "anthropic_version": "bedrock-2023-05-31",
            "messages": api_messages,
            "max_tokens": kwargs.get("max_tokens", 1024) or 1024,
            "temperature": kwargs.get("temperature", 0.7),
        }
        if system_prompt:
            payload["system"] = system_prompt

        def call():
            response = client.invoke_model(
                modelId=model,
                body=json.dumps(payload)
            )
            return json.loads(response.get('body').read())

        try:
            data = await asyncio.to_thread(call)
            return data.get("content", [{}])[0].get("text", "")
        except Exception as e:
            return f"[Bedrock Error] {e}"

    async def stream(self, messages: List[Dict[str, Any]], model: str, **kwargs) -> AsyncGenerator[str, None]:
        client = self._get_client()
        system_prompt, api_messages = self._transform_messages(messages)
        
        payload = {
            "anthropic_version": "bedrock-2023-05-31",
            "messages": api_messages,
            "max_tokens": kwargs.get("max_tokens", 1024) or 1024,
            "temperature": kwargs.get("temperature", 0.7),
        }
        if system_prompt:
            payload["system"] = system_prompt

        def get_stream():
            response = client.invoke_model_with_response_stream(
                modelId=model,
                body=json.dumps(payload)
            )
            return response.get('body')

        try:
            stream = await asyncio.to_thread(get_stream)
            if stream:
                # We iterate over the stream events synchronously in a helper list
                # or read events one by one in thread loop.
                # To stream async, we wrap the event retrieval.
                loop = asyncio.get_event_loop()
                iterator = iter(stream)
                
                while True:
                    # Fetch next event in a thread
                    def next_event():
                        try:
                            return next(iterator)
                        except StopIteration:
                            return None
                            
                    event = await loop.run_in_executor(None, next_event)
                    if event is None:
                        break
                        
                    chunk = event.get('chunk')
                    if chunk:
                        chunk_data = json.loads(chunk.get('bytes').decode())
                        if chunk_data.get('type') == 'content_block_delta':
                            delta = chunk_data.get('delta', {})
                            if delta.get('type') == 'text_delta':
                                yield delta.get('text', "")
        except Exception as e:
            yield f"[Bedrock Stream Error] {e}"

    async def get_models(self) -> List[str]:
        return [
            "anthropic.claude-3-sonnet-20240229-v1:0",
            "anthropic.claude-3-haiku-20240307-v1:0",
            "anthropic.claude-v2"
        ]
        
from typing import Optional
