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
        search_provider = kwargs.pop("search_provider", "tavily")
        tavily_api_key = kwargs.pop("tavily_api_key", None)
        exa_api_key = kwargs.pop("exa_api_key", None)
        clean_model = model.replace("models/", "") if model.startswith("models/") else model
        
        tools = kwargs.get("tools")
        if tools is None:
            from app.skills.router import skill_router
            tools = skill_router.get_relevant_skills(messages)
        
        async with httpx.AsyncClient() as client:
            payload = {
                "model": clean_model,
                "messages": messages,
                "stream": False,
                **kwargs
            }
            if tools:
                payload["tools"] = tools
                
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self._get_headers(),
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            message = data["choices"][0]["message"]
            
            # Check for tool calls
            if "tool_calls" in message and message["tool_calls"]:
                tool_calls = message["tool_calls"]
                # Append assistant message with tool calls
                messages.append(message)
                
                # Execute each tool call
                for tc in tool_calls:
                    tool_name = tc["function"]["name"]
                    arguments_str = tc["function"]["arguments"]
                    tool_call_id = tc["id"]
                    
                    try:
                        args = json.loads(arguments_str) if arguments_str else {}
                    except json.JSONDecodeError:
                        args = {}
                        
                    from app.skills.executor import skill_executor
                    exec_args = {
                        "search_provider": search_provider,
                        "tavily_api_key": tavily_api_key,
                        "exa_api_key": exa_api_key,
                        **args
                    }
                    user_id = kwargs.get("user_id", "default_user")
                    exec_result = await skill_executor.execute_skill(
                        skill_name=tool_name,
                        arguments=exec_args,
                        user_id=user_id
                    )
                    tool_result = exec_result.to_string()
                        
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call_id,
                        "name": tool_name,
                        "content": tool_result
                    })
                
                # Recurse to generate response based on tool results
                return await self.generate(
                    messages=messages,
                    model=model,
                    search_provider=search_provider,
                    tavily_api_key=tavily_api_key,
                    exa_api_key=exa_api_key,
                    **kwargs
                )
            
            return message["content"]

    async def stream(self, messages: List[Dict[str, Any]], model: str, **kwargs) -> AsyncGenerator[str, None]:
        search_provider = kwargs.pop("search_provider", "tavily")
        tavily_api_key = kwargs.pop("tavily_api_key", None)
        exa_api_key = kwargs.pop("exa_api_key", None)
        clean_model = model.replace("models/", "") if model.startswith("models/") else model
        
        tools = kwargs.get("tools")
        if tools is None:
            from app.skills.router import skill_router
            tools = skill_router.get_relevant_skills(messages)
        
        async with httpx.AsyncClient() as client:
            payload = {
                "model": clean_model,
                "messages": messages,
                "stream": True,
                **kwargs
            }
            if tools:
                payload["tools"] = tools
                
            tool_calls_map = {}
            is_tool_call = False
            
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
                            choice = data["choices"][0]
                            delta = choice.get("delta", {})
                            
                            # Check if the model is returning tool calls
                            if "tool_calls" in delta:
                                is_tool_call = True
                                for tc in delta["tool_calls"]:
                                    idx = tc["index"]
                                    if idx not in tool_calls_map:
                                        tool_calls_map[idx] = {
                                            "id": "",
                                            "type": "function",
                                            "function": {"name": "", "arguments": ""}
                                        }
                                    if "id" in tc:
                                        tool_calls_map[idx]["id"] += tc["id"]
                                    if "function" in tc:
                                        f = tc["function"]
                                        if "name" in f:
                                            tool_calls_map[idx]["function"]["name"] += f["name"]
                                        if "arguments" in f:
                                            tool_calls_map[idx]["function"]["arguments"] += f["arguments"]
                            
                            # If not a tool call, yield content if any
                            if not is_tool_call:
                                content = delta.get("content")
                                if content:
                                    yield content
                        except json.JSONDecodeError:
                            continue
            
            # If we accumulated tool calls, execute them and recurse
            if is_tool_call and tool_calls_map:
                tool_calls = [v for k, v in sorted(tool_calls_map.items())]
                
                # Append assistant message with tool calls
                messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": tool_calls
                })
                
                # Execute each tool call
                for tc in tool_calls:
                    tool_name = tc["function"]["name"]
                    arguments_str = tc["function"]["arguments"]
                    tool_call_id = tc["id"]
                    
                    try:
                        args = json.loads(arguments_str) if arguments_str else {}
                    except json.JSONDecodeError:
                        args = {}
                        
                    from app.skills.executor import skill_executor
                    exec_args = {
                        "search_provider": search_provider,
                        "tavily_api_key": tavily_api_key,
                        "exa_api_key": exa_api_key,
                        **args
                    }
                    user_id = kwargs.get("user_id", "default_user")
                    exec_result = await skill_executor.execute_skill(
                        skill_name=tool_name,
                        arguments=exec_args,
                        user_id=user_id
                    )
                    tool_result = exec_result.to_string()
                        
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call_id,
                        "name": tool_name,
                        "content": tool_result
                    })
                
                # Recursively stream to get final response based on tool results
                async for chunk in self.stream(
                    messages=messages,
                    model=model,
                    search_provider=search_provider,
                    tavily_api_key=tavily_api_key,
                    exa_api_key=exa_api_key,
                    **kwargs
                ):
                    yield chunk


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
            exclude_keywords = [
                "embedding", "imagen", "veo", "whisper", "tts", "dall-e", "clip", 
                "aqa", "robotics", "moderation", "edit", "babbage", "davinci", 
                "curie", "ada", "bison", "gecko", "unicorn", "audio", "realtime"
            ]
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


