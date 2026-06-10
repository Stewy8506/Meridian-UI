"""
Skill Router — Intent Classification + Dynamic Binding
------------------------------------------------------
Stage 1: Lightweight keyword → category mapping
Stage 2: TF-IDF semantic retrieval within categories
Stage 3: Return top-K skill schemas for LLM injection
"""

from typing import List, Dict, Any, Optional
from app.skills.categories import SkillCategory
from app.skills.registry import skill_registry

# Keyword → category heuristics (fast, no ML needed)
CATEGORY_KEYWORDS: Dict[SkillCategory, List[str]] = {
    SkillCategory.WEB: [
        "search", "find", "google", "web", "internet", "news", "article",
        "website", "url", "browse", "online", "wiki", "wikipedia", "arxiv",
        "paper", "research", "lookup", "scrape", "crawl", "rss", "feed"
    ],
    SkillCategory.CODE: [
        "code", "program", "script", "function", "bug", "error", "debug",
        "execute", "run", "python", "javascript", "typescript", "test",
        "unittest", "lint", "format", "diff", "refactor", "implement"
    ],
    SkillCategory.DATA: [
        "data", "csv", "excel", "spreadsheet", "analyze", "statistics",
        "chart", "graph", "plot", "visualize", "sql", "query", "regex",
        "json", "xml", "transform", "convert", "parse", "dataset"
    ],
    SkillCategory.FILE: [
        "file", "document", "pdf", "docx", "read", "write", "upload",
        "download", "convert", "ocr", "extract", "markdown", "render"
    ],
    SkillCategory.IMAGE: [
        "image", "picture", "photo", "generate", "draw", "edit", "paint",
        "dalle", "stable diffusion", "background", "remove", "describe",
        "vision", "see", "look", "visual", "crop", "resize"
    ],
    SkillCategory.AUDIO: [
        "audio", "voice", "speech", "speak", "listen", "transcribe",
        "whisper", "tts", "text to speech", "elevenlabs", "podcast",
        "microphone", "record", "sound"
    ],
    SkillCategory.COMMUNICATION: [
        "email", "message", "slack", "send", "draft", "write email",
        "notify", "communicate", "format message"
    ],
    SkillCategory.KNOWLEDGE: [
        "document", "knowledge", "memory", "remember", "recall", "store",
        "rag", "embedding", "semantic", "retrieval", "knowledge base"
    ],
    SkillCategory.UTILITY: [
        "calculate", "math", "date", "time", "convert", "unit", "uuid",
        "random", "hash", "qr", "translate", "language", "summarize",
        "summary", "shorten"
    ],
    SkillCategory.SYSTEM: [
        "canvas", "workflow", "trigger", "system", "internal"
    ]
}

DEFAULT_TOP_K = 8
MAX_TOP_K = 15


class SkillRouter:
    def __init__(self, top_k: int = DEFAULT_TOP_K):
        self.top_k = min(top_k, MAX_TOP_K)

    def classify_intent(self, message: str) -> List[SkillCategory]:
        """Stage 1: Keyword-based category classification."""
        msg_lower = message.lower()
        scored: Dict[SkillCategory, int] = {}

        for cat, keywords in CATEGORY_KEYWORDS.items():
            hits = sum(1 for kw in keywords if kw in msg_lower)
            if hits > 0:
                scored[cat] = hits

        if not scored:
            return list(SkillCategory)  # fallback: all categories

        # Return categories sorted by keyword hit count, take top 3
        sorted_cats = sorted(scored.items(), key=lambda x: x[1], reverse=True)
        top_cats = [cat for cat, _ in sorted_cats[:3]]
        return top_cats

    def get_relevant_skills(
        self,
        messages: List[Dict[str, Any]],
        top_k: Optional[int] = None
    ) -> List[Dict]:
        """
        Given conversation messages, return the top-K most relevant
        skill schemas for injection into the LLM tool_calls context.
        """
        k = top_k or self.top_k
        if not skill_registry._loaded:
            skill_registry.discover()

        # Use last user message as the query signal
        query = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                query = str(msg.get("content", ""))
                break

        if not query:
            return []

        # Stage 1: Intent classification
        categories = self.classify_intent(query)

        # Stage 2: Semantic retrieval — search within each relevant category
        seen_skills = set()
        results = []

        # Primary search within classified categories
        for cat in categories:
            cat_results = skill_registry.search(query, category=cat, top_k=k)
            for skill, score in cat_results:
                if skill.name not in seen_skills and score > 0.0:
                    seen_skills.add(skill.name)
                    results.append((skill, score))

        # If we got too few results, do a cross-category search
        if len(results) < 3:
            global_results = skill_registry.search(query, top_k=k)
            for skill, score in global_results:
                if skill.name not in seen_skills:
                    seen_skills.add(skill.name)
                    results.append((skill, score))

        # Sort by score, take top-K
        results.sort(key=lambda x: x[1], reverse=True)
        top_skills = [skill for skill, _ in results[:k]]

        # Stage 3: Dynamic binding — return tool schemas only
        return [skill.to_tool_schema() for skill in top_skills]


# Singleton
skill_router = SkillRouter()
