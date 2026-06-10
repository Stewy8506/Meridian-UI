"""
Web Search Skill
-----------------
Search the web using Tavily or Exa search APIs.
Migrated from the legacy tools/web_search.py.
"""
import json
import httpx
from typing import Optional
from app.skills.base import BaseSkill, SkillResult
from app.skills.categories import SkillCategory


class WebSearchSkill(BaseSkill):
    name = "web_search"
    display_name = "Web Search"
    description = "Search the web for current information, news, facts, URLs, articles, and research using Tavily or Exa search engines."
    category = SkillCategory.WEB
    tags = ["search", "internet", "research", "news", "web", "online", "google", "find"]
    version = "1.1.0"
    requires_auth = True
    required_config = []
    is_dangerous = False
    enabled = True
    timeout_seconds = 30

    @property
    def schema(self):
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query to look up on the web."
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results to return (1-10).",
                    "default": 5
                }
            },
            "required": ["query"]
        }

    async def execute(self, **kwargs) -> SkillResult:
        import time
        start = time.monotonic()

        query: str = kwargs.get("query", "")
        max_results: int = min(int(kwargs.get("max_results", 5)), 10)
        search_provider: str = kwargs.get("search_provider", "tavily")
        tavily_api_key: Optional[str] = kwargs.get("tavily_api_key")
        exa_api_key: Optional[str] = kwargs.get("exa_api_key")

        if not query:
            return SkillResult(
                success=False,
                data=None,
                skill_name=self.name,
                error="No search query provided."
            )

        try:
            result_text = await self._search(
                query=query,
                max_results=max_results,
                search_provider=search_provider,
                tavily_api_key=tavily_api_key,
                exa_api_key=exa_api_key
            )
            elapsed = (time.monotonic() - start) * 1000
            return SkillResult(
                success=True,
                data=result_text,
                skill_name=self.name,
                execution_time_ms=elapsed
            )
        except Exception as e:
            elapsed = (time.monotonic() - start) * 1000
            return SkillResult(
                success=False,
                data=None,
                skill_name=self.name,
                execution_time_ms=elapsed,
                error=str(e)
            )

    async def _search(self, query, max_results, search_provider, tavily_api_key, exa_api_key):
        async with httpx.AsyncClient() as client:
            if search_provider == "exa" and exa_api_key:
                return await self._exa_search(client, query, max_results, exa_api_key)
            elif tavily_api_key:
                return await self._tavily_search(client, query, max_results, tavily_api_key)
            else:
                return f"No search API key configured. Please add a Tavily or Exa API key in Settings."

    async def _tavily_search(self, client, query, max_results, api_key):
        resp = await client.post(
            "https://api.tavily.com/search",
            json={"api_key": api_key, "query": query, "max_results": max_results},
            timeout=20.0
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        if not results:
            return f"No results found for: {query}"
        lines = [f"Web search results for '{query}':\n"]
        for i, r in enumerate(results[:max_results], 1):
            lines.append(f"{i}. **{r.get('title', 'No title')}**")
            lines.append(f"   URL: {r.get('url', '')}")
            lines.append(f"   {r.get('content', '')[:300]}")
            lines.append("")
        return "\n".join(lines)

    async def _exa_search(self, client, query, max_results, api_key):
        resp = await client.post(
            "https://api.exa.ai/search",
            headers={"x-api-key": api_key, "Content-Type": "application/json"},
            json={"query": query, "numResults": max_results, "useAutoprompt": True},
            timeout=20.0
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        if not results:
            return f"No results found for: {query}"
        lines = [f"Web search results for '{query}':\n"]
        for i, r in enumerate(results[:max_results], 1):
            lines.append(f"{i}. **{r.get('title', 'No title')}**")
            lines.append(f"   URL: {r.get('url', '')}")
            lines.append(f"   {r.get('text', '')[:300]}")
            lines.append("")
        return "\n".join(lines)
