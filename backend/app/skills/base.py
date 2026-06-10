from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from app.skills.categories import SkillCategory


@dataclass
class SkillResult:
    """Structured result from a skill execution."""
    success: bool
    data: Any                        # The actual result data
    skill_name: str
    execution_time_ms: float = 0.0
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_string(self) -> str:
        """Convert result to string for LLM injection."""
        if not self.success:
            return f"[Skill Error: {self.skill_name}] {self.error}"
        if isinstance(self.data, str):
            return self.data
        import json
        return json.dumps(self.data, indent=2, default=str)


class BaseSkill(ABC):
    """Abstract base class for all skills in the engine."""

    # --- Required class-level attributes ---
    name: str = ""
    display_name: str = ""
    description: str = ""
    category: SkillCategory = SkillCategory.UTILITY
    tags: List[str] = []
    version: str = "1.0.0"
    requires_auth: bool = False
    required_config: List[str] = []
    is_dangerous: bool = False
    enabled: bool = True
    timeout_seconds: int = 30

    @property
    def schema(self) -> Dict:
        """JSON Schema for the skill's tool_call arguments."""
        return {
            "type": "object",
            "properties": {},
            "required": []
        }

    @abstractmethod
    async def execute(self, **kwargs) -> SkillResult:
        """Execute the skill with given arguments. Must be implemented."""
        raise NotImplementedError

    async def validate_config(self) -> bool:
        """Validate that required configuration/API keys are present."""
        from app.core.config import settings
        for key in self.required_config:
            if not getattr(settings, key, None):
                return False
        return True

    def to_tool_schema(self) -> Dict:
        """Convert skill to OpenAI tool_call format for LLM injection."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.schema
            }
        }

    def to_metadata(self) -> Dict:
        """Serialize skill metadata for registry/API responses."""
        return {
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "category": self.category.value,
            "tags": self.tags,
            "version": self.version,
            "requires_auth": self.requires_auth,
            "required_config": self.required_config,
            "is_dangerous": self.is_dangerous,
            "enabled": self.enabled,
            "schema": self.schema
        }
