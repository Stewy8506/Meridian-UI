"""
JSON Transform Skill
--------------------
Parse, query, transform, and format JSON data.
"""
import json
from app.skills.base import BaseSkill, SkillResult
from app.skills.categories import SkillCategory


class JsonTransformSkill(BaseSkill):
    name = "json_transform"
    display_name = "JSON Transform"
    description = "Parse, validate, query with dot-notation, format, minify, and transform JSON data structures."
    category = SkillCategory.DATA
    tags = ["json", "data", "parse", "transform", "format", "query", "structure", "api", "object"]
    version = "1.0.0"
    requires_auth = False
    is_dangerous = False
    enabled = True
    timeout_seconds = 10

    @property
    def schema(self):
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["validate", "format", "minify", "query", "keys"],
                    "description": "Action: validate (check validity), format (pretty print), minify (compact), query (get value by path), keys (list top-level keys)."
                },
                "json_string": {
                    "type": "string",
                    "description": "The JSON string to process."
                },
                "path": {
                    "type": "string",
                    "description": "Dot-notation path for querying (e.g. 'user.address.city' or 'items.0.name')."
                }
            },
            "required": ["action", "json_string"]
        }

    def _get_by_path(self, data, path: str):
        keys = path.split(".")
        current = data
        for key in keys:
            if isinstance(current, list):
                try:
                    key = int(key)
                except ValueError:
                    raise KeyError(f"Expected integer index, got '{key}'")
            if isinstance(current, dict):
                current = current[key]
            elif isinstance(current, list):
                current = current[key]
            else:
                raise KeyError(f"Cannot traverse further at key '{key}'")
        return current

    async def execute(self, **kwargs) -> SkillResult:
        import time
        start = time.monotonic()
        action = kwargs.get("action", "format")
        json_string = kwargs.get("json_string", "")
        path = kwargs.get("path", "")

        if not json_string:
            return SkillResult(success=False, data=None, skill_name=self.name, error="No JSON string provided.")

        try:
            data = json.loads(json_string)
        except json.JSONDecodeError as e:
            elapsed = (time.monotonic() - start) * 1000
            if action == "validate":
                return SkillResult(
                    success=True,
                    data=f"❌ **Invalid JSON**: {e}\n- Position: line {e.lineno}, column {e.colno}",
                    skill_name=self.name,
                    execution_time_ms=elapsed
                )
            return SkillResult(success=False, data=None, skill_name=self.name, execution_time_ms=elapsed, error=f"Invalid JSON: {e}")

        try:
            if action == "validate":
                # Count items
                if isinstance(data, dict):
                    summary = f"Object with {len(data)} keys: {list(data.keys())[:10]}"
                elif isinstance(data, list):
                    summary = f"Array with {len(data)} items"
                else:
                    summary = f"Scalar value: {type(data).__name__}"
                result = f"✅ **Valid JSON**\n- Type: {type(data).__name__}\n- Summary: {summary}"

            elif action == "format":
                formatted = json.dumps(data, indent=2, ensure_ascii=False)
                result = f"```json\n{formatted[:3000]}\n```"
                if len(formatted) > 3000:
                    result += f"\n\n_(truncated — full size: {len(formatted)} chars)_"

            elif action == "minify":
                minified = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
                result = f"**Minified JSON** ({len(minified)} chars):\n```\n{minified[:2000]}\n```"

            elif action == "query":
                if not path:
                    return SkillResult(success=False, data=None, skill_name=self.name, error="No path provided for query.")
                value = self._get_by_path(data, path)
                if isinstance(value, (dict, list)):
                    result = f"**Value at `{path}`:**\n```json\n{json.dumps(value, indent=2)[:2000]}\n```"
                else:
                    result = f"**Value at `{path}`:** `{value}` ({type(value).__name__})"

            elif action == "keys":
                if isinstance(data, dict):
                    result = f"**Top-level keys** ({len(data)}):\n" + "\n".join(f"- `{k}` ({type(v).__name__})" for k, v in list(data.items())[:30])
                elif isinstance(data, list):
                    result = f"**Array** with {len(data)} items. First item keys: "
                    if data and isinstance(data[0], dict):
                        result += ", ".join(f"`{k}`" for k in data[0].keys())
                    else:
                        result += str(type(data[0]).__name__ if data else "empty")
                else:
                    result = f"Scalar value: `{data}`"

            else:
                result = "Unknown action."

            elapsed = (time.monotonic() - start) * 1000
            return SkillResult(success=True, data=result, skill_name=self.name, execution_time_ms=elapsed)

        except Exception as e:
            elapsed = (time.monotonic() - start) * 1000
            return SkillResult(success=False, data=None, skill_name=self.name, execution_time_ms=elapsed, error=str(e))
