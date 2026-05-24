from app.tools.base import BaseTool
from app.core.config import settings
import httpx

class WebSearchTool(BaseTool):
    @property
    def name(self) -> str:
        return "web_search"

    @property
    def description(self) -> str:
        return "Search the web for real-time information or specific queries."

    @property
    def schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query."
                }
            },
            "required": ["query"]
        }

    async def execute(self, query: str, search_provider: str = "tavily", **kwargs) -> str:
        if search_provider == "exa":
            key = kwargs.get("exa_api_key") or settings.EXA_API_KEY
            if not key:
                return "Error: Exa API key is not provided. Please set it in Settings."
            return await self._search_exa(query, key)
        else:
            # Default to tavily
            key = kwargs.get("tavily_api_key") or settings.TAVILY_API_KEY
            if not key:
                return "Error: Tavily API key is not provided. Please set it in Settings."
            return await self._search_tavily(query, key)

    async def _search_tavily(self, query: str, api_key: str) -> str:
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": api_key,
            "query": query,
            "search_depth": "basic",
            "max_results": 5
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, timeout=15.0)
                response.raise_for_status()
                data = response.json()
                results = data.get("results", [])
                if not results:
                    return "No results found on Tavily."
                
                formatted = []
                for i, res in enumerate(results, 1):
                    title = res.get("title", "Untitled")
                    link = res.get("url", "")
                    content = res.get("content", "").strip()
                    formatted.append(f"[{i}] {title}\nURL: {link}\nSnippet: {content}\n")
                return "\n".join(formatted)
            except Exception as e:
                return f"Error executing Tavily search: {str(e)}"

    async def _search_exa(self, query: str, api_key: str) -> str:
        url = "https://api.exa.ai/search"
        headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "query": query,
            "numResults": 5,
            "contents": {
                "text": {
                    "maxCharacters": 1000
                },
                "highlights": {
                    "numSentences": 2
                }
            }
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=headers, json=payload, timeout=15.0)
                response.raise_for_status()
                data = response.json()
                results = data.get("results", [])
                if not results:
                    return "No results found on Exa."
                
                formatted = []
                for i, res in enumerate(results, 1):
                    title = res.get("title", "Untitled")
                    link = res.get("url", "")
                    
                    # Try to use highlights first, fall back to text snippet
                    highlights = res.get("highlights", [])
                    if highlights:
                        content = " ".join(highlights)
                    else:
                        text = res.get("text", "")
                        content = text[:400] + "..." if len(text) > 400 else text
                        
                    formatted.append(f"[{i}] {title}\nURL: {link}\nSnippet: {content}\n")
                return "\n".join(formatted)
            except Exception as e:
                return f"Error executing Exa search: {str(e)}"
