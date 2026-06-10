import time
import re
from typing import List
from app.skills.base import BaseSkill, SkillResult
from app.skills.categories import SkillCategory
from app.database.session import SessionLocal
from app.database.models.user import Memory

class MemoryRecallSkill(BaseSkill):
    name = "memory_recall"
    display_name = "Memory Recall"
    description = "Recall previously stored facts, details, and user preferences from long-term memory."
    category = SkillCategory.KNOWLEDGE
    tags = ["remember", "recall", "memory", "retrieve", "facts"]
    version = "1.0.0"
    requires_auth = False
    is_dangerous = False
    enabled = True

    @property
    def schema(self):
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Keywords or topic to search for in memory (optional)."
                }
            }
        }

    async def execute(self, **kwargs) -> SkillResult:
        start = time.monotonic()
        query: str = kwargs.get("query", "").strip().lower()
        user_id: str = kwargs.get("user_id", "default_user")

        try:
            with SessionLocal() as db:
                # Fetch all memories for this user
                memories = db.query(Memory).filter(Memory.user_id == user_id).all()
                
                if not memories:
                    elapsed = (time.monotonic() - start) * 1000
                    return SkillResult(
                        success=True,
                        data="No stored memories found for this user.",
                        skill_name=self.name,
                        execution_time_ms=elapsed
                    )

                results = []
                if query:
                    # Simple keyword ranking: count word matches
                    query_words = set(re.findall(r'\w+', query))
                    # Remove common short stop words
                    query_words = {w for w in query_words if len(w) > 2}
                    
                    scored_memories = []
                    for m in memories:
                        fact_words = set(re.findall(r'\w+', m.fact_text.lower()))
                        matches = len(query_words.intersection(fact_words))
                        # If a query matches any word, or if query is a substring of the text
                        if matches > 0 or query in m.fact_text.lower():
                            scored_memories.append((matches, m))
                    
                    # Sort by match count (descending)
                    scored_memories.sort(key=lambda x: x[0], reverse=True)
                    results = [item[1] for item in scored_memories]
                else:
                    # Return all memories, sorted by created_at (newest first)
                    memories.sort(key=lambda x: x.created_at, reverse=True)
                    results = memories

                if not results:
                    elapsed = (time.monotonic() - start) * 1000
                    return SkillResult(
                        success=True,
                        data=f"No matching memories found for search query: '{query}'",
                        skill_name=self.name,
                        execution_time_ms=elapsed
                    )

                # Format the output
                formatted_list = []
                for i, m in enumerate(results, 1):
                    # date_str = m.created_at.strftime("%Y-%m-%d")
                    formatted_list.append(f"{i}. {m.fact_text}")
                
                output_str = "Recalled memories:\n" + "\n".join(formatted_list)
                elapsed = (time.monotonic() - start) * 1000
                return SkillResult(
                    success=True,
                    data=output_str,
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
