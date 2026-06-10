"""
arXiv Search Skill
------------------
Search academic papers on arXiv.org.
"""
import httpx
import xml.etree.ElementTree as ET
from app.skills.base import BaseSkill, SkillResult
from app.skills.categories import SkillCategory


class ArxivSearchSkill(BaseSkill):
    name = "arxiv_search"
    display_name = "arXiv Paper Search"
    description = "Search academic papers, research articles, and preprints on arXiv.org. Great for finding cutting-edge AI, math, physics, and CS research."
    category = SkillCategory.WEB
    tags = ["arxiv", "paper", "research", "academic", "science", "preprint", "AI", "machine learning"]
    version = "1.0.0"
    requires_auth = False
    is_dangerous = False
    enabled = True
    timeout_seconds = 20

    @property
    def schema(self):
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query for academic papers (e.g. 'transformer attention mechanism', 'quantum computing')."
                },
                "max_results": {
                    "type": "integer",
                    "description": "Number of papers to return (1-10).",
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

        if not query:
            return SkillResult(success=False, data=None, skill_name=self.name, error="No query provided.")

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "http://export.arxiv.org/api/query",
                    params={
                        "search_query": f"all:{query}",
                        "start": 0,
                        "max_results": max_results,
                        "sortBy": "relevance",
                        "sortOrder": "descending"
                    },
                    timeout=15.0
                )
                resp.raise_for_status()

            root = ET.fromstring(resp.text)
            ns = {"atom": "http://www.w3.org/2005/Atom"}
            entries = root.findall("atom:entry", ns)

            if not entries:
                return SkillResult(
                    success=True,
                    data=f"No arXiv papers found for '{query}'.",
                    skill_name=self.name,
                    execution_time_ms=(time.monotonic() - start) * 1000
                )

            lines = [f"arXiv papers for '{query}':\n"]
            for i, entry in enumerate(entries[:max_results], 1):
                title = entry.findtext("atom:title", namespaces=ns, default="No title").strip().replace("\n", " ")
                summary = entry.findtext("atom:summary", namespaces=ns, default="").strip().replace("\n", " ")[:250]
                link_el = entry.find("atom:id", ns)
                url = link_el.text.strip() if link_el is not None else ""
                authors = [a.findtext("atom:name", namespaces=ns, default="") for a in entry.findall("atom:author", ns)]
                author_str = ", ".join(authors[:3]) + ("..." if len(authors) > 3 else "")

                lines.append(f"{i}. **{title}**")
                lines.append(f"   Authors: {author_str}")
                lines.append(f"   {summary}...")
                lines.append(f"   URL: {url}")
                lines.append("")

            elapsed = (time.monotonic() - start) * 1000
            return SkillResult(success=True, data="\n".join(lines), skill_name=self.name, execution_time_ms=elapsed)

        except Exception as e:
            elapsed = (time.monotonic() - start) * 1000
            return SkillResult(success=False, data=None, skill_name=self.name, execution_time_ms=elapsed, error=str(e))
