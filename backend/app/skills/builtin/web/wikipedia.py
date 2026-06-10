"""
Wikipedia Skill
----------------
Search and retrieve Wikipedia article summaries.
"""
import httpx
from app.skills.base import BaseSkill, SkillResult
from app.skills.categories import SkillCategory


class WikipediaSkill(BaseSkill):
    name = "wikipedia"
    display_name = "Wikipedia"
    description = "Search Wikipedia to retrieve factual summaries, definitions, historical information, and encyclopedic knowledge."
    category = SkillCategory.WEB
    tags = ["wikipedia", "wiki", "facts", "encyclopedia", "definition", "history", "knowledge"]
    version = "1.0.0"
    requires_auth = False
    is_dangerous = False
    enabled = True
    timeout_seconds = 15

    @property
    def schema(self):
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The topic or term to search on Wikipedia."
                },
                "sentences": {
                    "type": "integer",
                    "description": "Number of summary sentences to return (1-10).",
                    "default": 5
                }
            },
            "required": ["query"]
        }

    async def execute(self, **kwargs) -> SkillResult:
        import time
        start = time.monotonic()
        query: str = kwargs.get("query", "")
        sentences: int = min(int(kwargs.get("sentences", 5)), 10)

        if not query:
            return SkillResult(success=False, data=None, skill_name=self.name, error="No query provided.")

        try:
            async with httpx.AsyncClient() as client:
                # Search for the page
                search_resp = await client.get(
                    "https://en.wikipedia.org/w/api.php",
                    params={
                        "action": "query",
                        "format": "json",
                        "list": "search",
                        "srsearch": query,
                        "srlimit": 1
                    },
                    timeout=10.0
                )
                search_resp.raise_for_status()
                search_data = search_resp.json()
                results = search_data.get("query", {}).get("search", [])

                if not results:
                    return SkillResult(
                        success=True,
                        data=f"No Wikipedia article found for '{query}'.",
                        skill_name=self.name,
                        execution_time_ms=(time.monotonic() - start) * 1000
                    )

                page_title = results[0]["title"]

                # Get the summary
                summary_resp = await client.get(
                    f"https://en.wikipedia.org/api/rest_v1/page/summary/{page_title.replace(' ', '_')}",
                    timeout=10.0
                )
                summary_resp.raise_for_status()
                summary_data = summary_resp.json()

                title = summary_data.get("title", page_title)
                extract = summary_data.get("extract", "No summary available.")
                url = summary_data.get("content_urls", {}).get("desktop", {}).get("page", "")

                # Truncate to requested sentences
                import re
                sentence_list = re.split(r'(?<=[.!?])\s+', extract)
                truncated = " ".join(sentence_list[:sentences])

                result = f"**{title}** (Wikipedia)\n\n{truncated}"
                if url:
                    result += f"\n\nRead more: {url}"

                elapsed = (time.monotonic() - start) * 1000
                return SkillResult(success=True, data=result, skill_name=self.name, execution_time_ms=elapsed)

        except Exception as e:
            elapsed = (time.monotonic() - start) * 1000
            return SkillResult(success=False, data=None, skill_name=self.name, execution_time_ms=elapsed, error=str(e))
