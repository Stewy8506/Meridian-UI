import time
from app.skills.base import BaseSkill, SkillResult
from app.skills.categories import SkillCategory
from app.database.session import SessionLocal
from app.database.models.user import Memory

class MemoryStoreSkill(BaseSkill):
    name = "memory_store"
    display_name = "Memory Store"
    description = "Store a specific fact, preference, or detail about the user in long-term memory for later recall."
    category = SkillCategory.KNOWLEDGE
    tags = ["remember", "store", "memory", "save", "fact"]
    version = "1.0.0"
    requires_auth = False
    is_dangerous = False
    enabled = True

    @property
    def schema(self):
        return {
            "type": "object",
            "properties": {
                "fact": {
                    "type": "string",
                    "description": "The specific fact, detail, or preference to store (e.g., 'User prefers dark mode and Python programming')."
                }
            },
            "required": ["fact"]
        }

    async def execute(self, **kwargs) -> SkillResult:
        start = time.monotonic()
        fact: str = kwargs.get("fact", "").strip()
        user_id: str = kwargs.get("user_id", "default_user")

        if not fact:
            return SkillResult(success=False, data=None, skill_name=self.name, error="No fact content provided.")

        try:
            with SessionLocal() as db:
                memory = Memory(
                    user_id=user_id,
                    fact_text=fact
                )
                db.add(memory)
                db.commit()
                db.refresh(memory)
                
                elapsed = (time.monotonic() - start) * 1000
                return SkillResult(
                    success=True,
                    data=f"Successfully remembered: '{fact}'",
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
