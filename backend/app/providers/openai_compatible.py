import json
import httpx
from typing import AsyncGenerator, List, Dict, Any
from app.providers.base import BaseProvider
def extract_partial_fields(json_str: str) -> dict:
    idx = 0
    n = len(json_str)
    
    # Skip whitespace and '{'
    while idx < n and json_str[idx].isspace():
        idx += 1
    if idx < n and json_str[idx] == '{':
        idx += 1
        
    results = {}
    
    def parse_string():
        nonlocal idx
        # Expects '"' at current position
        if idx >= n or json_str[idx] != '"':
            return None, False
        idx += 1 # Consume open quote
        res = []
        is_complete = False
        while idx < n:
            c = json_str[idx]
            if c == '"':
                idx += 1
                is_complete = True
                break
            elif c == '\\':
                if idx + 1 < n:
                    next_c = json_str[idx + 1]
                    if next_c == '"':
                        res.append('"')
                    elif next_c == '\\':
                        res.append('\\')
                    elif next_c == '/':
                        res.append('/')
                    elif next_c == 'n':
                        res.append('\n')
                    elif next_c == 'r':
                        res.append('\r')
                    elif next_c == 't':
                        res.append('\t')
                    elif next_c == 'b':
                        res.append('\b')
                    elif next_c == 'f':
                        res.append('\f')
                    elif next_c == 'u':
                        # Handle unicode escape \uXXXX
                        if idx + 5 < n:
                            hex_code = json_str[idx+2:idx+6]
                            try:
                                res.append(chr(int(hex_code, 16)))
                            except ValueError:
                                res.append('\\u' + hex_code)
                            idx += 4
                        else:
                            # Incomplete unicode escape
                            res.append(json_str[idx:n])
                            idx = n
                            break
                    else:
                        res.append('\\' + next_c)
                    idx += 2
                else:
                    # Incomplete escape at the end
                    res.append('\\')
                    idx += 1
            else:
                res.append(c)
                idx += 1
        return "".join(res), is_complete

    def skip_value():
        nonlocal idx
        # Skip whitespaces
        while idx < n and json_str[idx].isspace():
            idx += 1
        if idx >= n:
            return
        c = json_str[idx]
        if c == '"':
            # Skip string
            parse_string()
        elif c in '{[':
            # Skip nested structure by balancing braces/brackets
            opener = c
            closer = '}' if c == '{' else ']'
            depth = 0
            in_str = False
            while idx < n:
                ch = json_str[idx]
                if in_str:
                    if ch == '"':
                        in_str = False
                    elif ch == '\\':
                        idx += 1
                else:
                    if ch == '"':
                        in_str = True
                    elif ch == opener:
                        depth += 1
                    elif ch == closer:
                        depth -= 1
                        if depth == 0:
                            idx += 1
                            break
                idx += 1
        else:
            # Skip primitive value (number, true, false, null)
            while idx < n and json_str[idx] not in ',}':
                idx += 1

    while idx < n:
        # Skip whitespace
        while idx < n and json_str[idx].isspace():
            idx += 1
        if idx >= n or json_str[idx] == '}':
            break
            
        # Parse key (must be string)
        if json_str[idx] != '"':
            idx += 1
            continue
            
        key, key_complete = parse_string()
        if not key_complete or key is None:
            break
            
        # Skip whitespace, colon, whitespace
        while idx < n and json_str[idx].isspace():
            idx += 1
        if idx < n and json_str[idx] == ':':
            idx += 1
        else:
            break
        while idx < n and json_str[idx].isspace():
            idx += 1
            
        if idx >= n:
            break
            
        if json_str[idx] == '"':
            val, val_complete = parse_string()
            results[key] = val
        else:
            skip_value()
            
        # Skip whitespace and comma
        while idx < n and json_str[idx].isspace():
            idx += 1
        if idx < n and json_str[idx] == ',':
            idx += 1
            
    return results

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

    def _get_url(self, model: str) -> str:
        return f"{self.base_url}/chat/completions"

    async def generate(self, messages: List[Dict[str, Any]], model: str, **kwargs) -> str:
        search_provider = kwargs.pop("search_provider", "tavily")
        tavily_api_key = kwargs.pop("tavily_api_key", None)
        exa_api_key = kwargs.pop("exa_api_key", None)
        user_id = kwargs.pop("user_id", "default_user")
        conversation_id = kwargs.pop("conversation_id", None)
        clean_model = model.replace("models/", "") if model.startswith("models/") else model
        
        tools = kwargs.get("tools")
        if tools is None:
            from app.skills.router import skill_router
            tools = skill_router.get_relevant_skills(messages)
            
        is_fallback_attempt = kwargs.pop("is_fallback_attempt", False)
        
        async with httpx.AsyncClient() as client:
            payload = {
                "model": clean_model,
                "messages": messages,
                "stream": False,
                **kwargs
            }
            if tools:
                payload["tools"] = tools
                
            try:
                response = await client.post(
                    self._get_url(clean_model),
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
                            "conversation_id": conversation_id,
                            **args
                        }
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
                        user_id=user_id,
                        conversation_id=conversation_id,
                        is_fallback_attempt=is_fallback_attempt,
                        **kwargs
                    )
                
                return message["content"]
            except (httpx.HTTPStatusError, httpx.TimeoutException) as e:
                if not is_fallback_attempt and ("generativelanguage.googleapis.com" in self.base_url or "gemini" in clean_model):
                    fallback_model = "gemini-2.5-flash"
                    import logging
                    logging.getLogger("app.providers.openai_compatible").warning(
                        f"Model {clean_model} failed with {e}. Falling back to {fallback_model}."
                    )
                    return await self.generate(
                        messages=messages,
                        model=fallback_model,
                        search_provider=search_provider,
                        tavily_api_key=tavily_api_key,
                        exa_api_key=exa_api_key,
                        user_id=user_id,
                        conversation_id=conversation_id,
                        is_fallback_attempt=True,
                        **kwargs
                    )
                else:
                    raise e

    async def stream(self, messages: List[Dict[str, Any]], model: str, **kwargs) -> AsyncGenerator[str, None]:
        search_provider = kwargs.pop("search_provider", "tavily")
        tavily_api_key = kwargs.pop("tavily_api_key", None)
        exa_api_key = kwargs.pop("exa_api_key", None)
        user_id = kwargs.pop("user_id", "default_user")
        conversation_id = kwargs.pop("conversation_id", None)
        clean_model = model.replace("models/", "") if model.startswith("models/") else model
        
        tools = kwargs.get("tools")
        if tools is None:
            from app.skills.router import skill_router
            tools = skill_router.get_relevant_skills(messages)
            
        is_fallback_attempt = kwargs.pop("is_fallback_attempt", False)
        
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
            accumulated_content = []
            canvas_states = {} # tool_idx -> {"started": bool, "last_len": int}
            
            try:
                async with client.stream(
                    "POST", 
                    self._get_url(clean_model), 
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
                                    for idx, tc in enumerate(delta["tool_calls"]):
                                        tool_idx = tc.get("index", idx)
                                        if tool_idx not in tool_calls_map:
                                            tool_calls_map[tool_idx] = {
                                                "id": "",
                                                "type": "function",
                                                "function": {"name": "", "arguments": ""}
                                            }
                                        if "id" in tc:
                                            tool_calls_map[tool_idx]["id"] += tc["id"]
                                        if "function" in tc:
                                            f = tc["function"]
                                            if "name" in f:
                                                tool_calls_map[tool_idx]["function"]["name"] += f["name"]
                                            if "arguments" in f:
                                                tool_calls_map[tool_idx]["function"]["arguments"] += f["arguments"]

                                        # Handle real-time canvas stream translation
                                        tc_info = tool_calls_map[tool_idx]
                                        if tc_info["function"]["name"] == "canvas_write":
                                            if tool_idx not in canvas_states:
                                                canvas_states[tool_idx] = {"started": False, "last_len": 0}
                                            
                                            state = canvas_states[tool_idx]
                                            args_str = tc_info["function"]["arguments"]
                                            parsed = extract_partial_fields(args_str)
                                            filename = parsed.get("filename", "")
                                            content = parsed.get("content", "")
                                            
                                            language = parsed.get("language", "")
                                            if not language and filename:
                                                ext = filename.split(".")[-1].lower() if "." in filename else ""
                                                lang_map = {
                                                    "html": "html", "js": "javascript", "ts": "typescript",
                                                    "tsx": "typescript", "jsx": "javascript", "css": "css",
                                                    "py": "python", "json": "json", "md": "markdown",
                                                    "mermaid": "mermaid"
                                                }
                                                language = lang_map.get(ext, "markdown")
                                            elif not language:
                                                language = "markdown"
                                                
                                            if filename and not state["started"]:
                                                state["started"] = True
                                                yield f'<canvas_write filename="{filename}" language="{language}">'
                                            
                                            if state["started"] and content:
                                                curr_len = len(content)
                                                delta_content = content[state["last_len"]:curr_len]
                                                if delta_content:
                                                    yield delta_content
                                                    state["last_len"] = curr_len
                                
                                # Yield and accumulate content if any
                                content = delta.get("content")
                                if content:
                                    accumulated_content.append(content)
                                    if not is_tool_call:
                                        yield content
                            except json.JSONDecodeError:
                                continue
                    
                    # Close any open canvas_write tags
                    for tool_idx, state in canvas_states.items():
                        if state["started"]:
                            yield "</canvas_write>"
            except (httpx.HTTPStatusError, httpx.TimeoutException) as e:
                if not is_fallback_attempt and ("generativelanguage.googleapis.com" in self.base_url or "gemini" in clean_model):
                    fallback_model = "gemini-2.5-flash"
                    import logging
                    logging.getLogger("app.providers.openai_compatible").warning(
                        f"Model {clean_model} failed with {e}. Falling back to {fallback_model}."
                    )
                    async for chunk in self.stream(
                        messages=messages,
                        model=fallback_model,
                        search_provider=search_provider,
                        tavily_api_key=tavily_api_key,
                        exa_api_key=exa_api_key,
                        user_id=user_id,
                        conversation_id=conversation_id,
                        is_fallback_attempt=True,
                        **kwargs
                    ):
                        yield chunk
                else:
                    raise e
            
            # If we accumulated tool calls, execute them and recurse
            if is_tool_call and tool_calls_map:
                tool_calls = [v for k, v in sorted(tool_calls_map.items())]
                
                assistant_content = "".join(accumulated_content) if accumulated_content else None
                # Append assistant message with tool calls and accumulated content
                messages.append({
                    "role": "assistant",
                    "content": assistant_content,
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
                        "conversation_id": conversation_id,
                        **args
                    }
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
                    user_id=user_id,
                    conversation_id=conversation_id,
                    is_fallback_attempt=is_fallback_attempt,
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


