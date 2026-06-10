import asyncio
import logging
import time
from app.skills.registry import skill_registry
from app.skills.base import SkillResult

logger = logging.getLogger(__name__)

class SkillExecutor:
    async def execute_skill(self, skill_name: str, arguments: dict, user_id: str = "default_user") -> SkillResult:
        """
        Execute a skill by name with arguments.
        Enforces timeout limits, validates configuration, and returns a structured SkillResult.
        """
        if not skill_registry._loaded:
            skill_registry.discover()
            
        skill = skill_registry.get(skill_name)
        if not skill:
            return SkillResult(
                success=False,
                data=None,
                skill_name=skill_name,
                error=f"Skill '{skill_name}' not found."
            )
            
        if not skill_registry.is_enabled(skill_name):
            return SkillResult(
                success=False,
                data=None,
                skill_name=skill_name,
                error=f"Skill '{skill_name}' is currently disabled."
            )
            
        # Validate configuration/API key requirements
        config_valid = await skill.validate_config()
        if not config_valid:
            return SkillResult(
                success=False,
                data=None,
                skill_name=skill_name,
                error=f"Skill '{skill_name}' is missing required configuration/API keys: {', '.join(skill.required_config)}."
            )
            
        # Inject user_id context for personal/database skills (e.g. Memory recall/store)
        arguments["user_id"] = user_id
        
        start_time = time.monotonic()
        try:
            logger.info(f"Executing skill {skill_name} with arguments: {arguments}")
            # Enforce timeout
            result = await asyncio.wait_for(
                skill.execute(**arguments),
                timeout=skill.timeout_seconds
            )
            # Ensure execution_time_ms is populated if not done by skill
            if result.execution_time_ms <= 0.0:
                result.execution_time_ms = (time.monotonic() - start_time) * 1000
            return result
        except asyncio.TimeoutError:
            elapsed = (time.monotonic() - start_time) * 1000
            return SkillResult(
                success=False,
                data=None,
                skill_name=skill_name,
                execution_time_ms=elapsed,
                error=f"Execution timed out after {skill.timeout_seconds} seconds."
            )
        except Exception as e:
            elapsed = (time.monotonic() - start_time) * 1000
            logger.error(f"Error executing skill {skill_name}: {e}", exc_info=True)
            return SkillResult(
                success=False,
                data=None,
                skill_name=skill_name,
                execution_time_ms=elapsed,
                error=str(e)
            )

skill_executor = SkillExecutor()
