import json
import httpx
from typing import AsyncGenerator, List, Dict, Any, Optional
from app.providers.base import BaseProvider

class AnthropicProvider(BaseProvider):
    """
    Native HTTP adapter for Anthropic Claude Messages API (v1).
    Avoids using external heavy libraries by wrapping standard HTTP requests.
    """
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.anthropic.com/v1"

    def _get_headers(self) -> dict:
        return {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }

    def _transform_messages(self, messages: List[Dict[str, Any]]) -> tuple[Optional[str], List[Dict[str, Any]]]:
        """Extracts system prompt and maps user/assistant messages to Anthropic format."""
        system_prompt = None
        transformed = []
        
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content")
            
            if role == "system":
                system_prompt = content
            elif role in ("user", "assistant"):
                # Anthropic doesn't allow empty assistant content, fallback to a single space if empty
                transformed.append({
                    "role": role,
                    "content": content or " "
                })
            elif role == "tool":
                # Convert tool role to user block with tool_result
                transformed.append({
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": msg.get("tool_call_id", ""),
                            "content": content
                        }
                    ]
                })

        return system_prompt, transformed

    def _transform_tools(self, tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Map OpenAI-formatted tool schemas to Anthropic formats."""
        anthropic_tools = []
        for t in tools:
            f = t.get("function", {})
            anthropic_tools.append({
                "name": f.get("name", ""),
                "description": f.get("description", ""),
                "input_schema": f.get("parameters", {"type": "object", "properties": {}})
            })
        return anthropic_tools

    async def generate(self, messages: List[Dict[str, Any]], model: str, **kwargs) -> str:
        search_provider = kwargs.pop("search_provider", "tavily")
        tavily_api_key = kwargs.pop("tavily_api_key", None)
        exa_api_key = kwargs.pop("exa_api_key", None)
        user_id = kwargs.get("user_id", "default_user")
        
        system_prompt, api_messages = self._transform_messages(messages)
        
        # Pull tools
        tools_list = kwargs.pop("tools", None)
        if tools_list is None:
            from app.skills.router import skill_router
            tools_list = skill_router.get_relevant_skills(messages)
        anthropic_tools = self._transform_tools(tools_list) if tools_list else []

        payload = {
            "model": model,
            "messages": api_messages,
            "max_tokens": kwargs.get("max_tokens", 1024) or 1024,
            "temperature": kwargs.get("temperature", 0.7),
        }
        if system_prompt:
            payload["system"] = system_prompt
        if anthropic_tools:
            payload["tools"] = anthropic_tools

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/messages",
                headers=self._get_headers(),
                json=payload,
                timeout=60.0
            )
            resp.raise_for_status()
            data = resp.json()
            
            content_list = data.get("content", [])
            text_out = ""
            tool_calls = []
            
            for block in content_list:
                if block.get("type") == "text":
                    text_out += block.get("text", "")
                elif block.get("type") == "tool_use":
                    tool_calls.append(block)

            # If there are tool calls, execute them and recurse
            if tool_calls:
                # Add assistant message with tool calls back to messages list
                messages.append({
                    "role": "assistant",
                    "content": content_list # Keep raw block struct
                })
                
                from app.skills.executor import skill_executor
                for tc in tool_calls:
                    tool_name = tc.get("name")
                    tool_use_id = tc.get("id")
                    arguments = tc.get("input", {})
                    
                    exec_args = {
                        "search_provider": search_provider,
                        "tavily_api_key": tavily_api_key,
                        "exa_api_key": exa_api_key,
                        **arguments
                    }
                    exec_result = await skill_executor.execute_skill(
                        skill_name=tool_name,
                        arguments=exec_args,
                        user_id=user_id
                    )
                    
                    # Convert to string and append to context
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_use_id,
                        "name": tool_name,
                        "content": exec_result.to_string()
                    })

                return await self.generate(
                    messages=messages,
                    model=model,
                    search_provider=search_provider,
                    tavily_api_key=tavily_api_key,
                    exa_api_key=exa_api_key,
                    user_id=user_id,
                    **kwargs
                )

            return text_out

    async def stream(self, messages: List[Dict[str, Any]], model: str, **kwargs) -> AsyncGenerator[str, None]:
        search_provider = kwargs.pop("search_provider", "tavily")
        tavily_api_key = kwargs.pop("tavily_api_key", None)
        exa_api_key = kwargs.pop("exa_api_key", None)
        user_id = kwargs.get("user_id", "default_user")
        
        system_prompt, api_messages = self._transform_messages(messages)
        
        tools_list = kwargs.get("tools")
        if tools_list is None:
            from app.skills.router import skill_router
            tools_list = skill_router.get_relevant_skills(messages)
        anthropic_tools = self._transform_tools(tools_list) if tools_list else []

        payload = {
            "model": model,
            "messages": api_messages,
            "max_tokens": kwargs.get("max_tokens", 1024) or 1024,
            "temperature": kwargs.get("temperature", 0.7),
            "stream": True
        }
        if system_prompt:
            payload["system"] = system_prompt
        if anthropic_tools:
            payload["tools"] = anthropic_tools

        tool_calls_map = {}
        is_tool_call = False

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/messages",
                headers=self._get_headers(),
                json=payload,
                timeout=60.0
            ) as response:
                response.raise_for_status()
                
                # Parse Anthropic SSE stream
                current_event = None
                async for line in response.aiter_lines():
                    if line.startswith("event: "):
                        current_event = line[7:].strip()
                    elif line.startswith("data: ") and current_event:
                        data_str = line[6:].strip()
                        try:
                            data = json.loads(data_str)
                            
                            if current_event == "content_block_start":
                                block = data.get("content_block", {})
                                if block.get("type") == "tool_use":
                                    is_tool_call = True
                                    idx = data.get("index", 0)
                                    tool_calls_map[idx] = {
                                        "id": block.get("id"),
                                        "name": block.get("name"),
                                        "input_str": ""
                                    }
                            
                            elif current_event == "content_block_delta":
                                delta = data.get("delta", {})
                                idx = data.get("index", 0)
                                
                                if delta.get("type") == "text_delta":
                                    yield delta.get("text", "")
                                elif delta.get("type") == "input_json_delta":
                                    tool_calls_map[idx]["input_str"] += delta.get("partial_json", "")
                                    
                        except json.JSONDecodeError:
                            continue

        # If a tool call was detected, execute it and recurse stream
        if is_tool_call and tool_calls_map:
            # Reformat to matching blocks for assistant message history
            assistant_content = []
            for idx, tc in sorted(tool_calls_map.items()):
                try:
                    args = json.loads(tc["input_str"]) if tc["input_str"] else {}
                except json.JSONDecodeError:
                    args = {}
                    
                assistant_content.append({
                    "type": "tool_use",
                    "id": tc["id"],
                    "name": tc["name"],
                    "input": args
                })
                
            messages.append({
                "role": "assistant",
                "content": assistant_content
            })
            
            from app.skills.executor import skill_executor
            for block in assistant_content:
                tool_name = block["name"]
                tool_use_id = block["id"]
                arguments = block["input"]
                
                exec_args = {
                    "search_provider": search_provider,
                    "tavily_api_key": tavily_api_key,
                    "exa_api_key": exa_api_key,
                    **arguments
                }
                exec_result = await skill_executor.execute_skill(
                    skill_name=tool_name,
                    arguments=exec_args,
                    user_id=user_id
                )
                
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_use_id,
                    "name": tool_name,
                    "content": exec_result.to_string()
                })
                
            # Recursive stream completion
            async for chunk in self.stream(
                messages=messages,
                model=model,
                search_provider=search_provider,
                tavily_api_key=tavily_api_key,
                exa_api_key=exa_api_key,
                user_id=user_id,
                **kwargs
            ):
                yield chunk

    async def get_models(self) -> List[str]:
        # Anthropic doesn't expose a dynamic models list endpoint, we list core static endpoints
        return [
            "claude-3-5-sonnet-latest",
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-latest",
            "claude-3-opus-latest"
        ]
