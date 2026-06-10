"""
UUID & Random Generator Skill
------------------------------
Generate UUIDs, random strings, passwords, and hashes.
"""
import uuid
import hashlib
import secrets
import string
from app.skills.base import BaseSkill, SkillResult
from app.skills.categories import SkillCategory


class UUIDGenerateSkill(BaseSkill):
    name = "uuid_generate"
    display_name = "UUID & Hash Generator"
    description = "Generate UUIDs (v1, v4), random strings, secure passwords, and compute hashes (MD5, SHA256)."
    category = SkillCategory.UTILITY
    tags = ["uuid", "random", "hash", "password", "generate", "string", "token", "id", "sha256"]
    version = "1.0.0"
    requires_auth = False
    is_dangerous = False
    enabled = True
    timeout_seconds = 5

    @property
    def schema(self):
        return {
            "type": "object",
            "properties": {
                "type": {
                    "type": "string",
                    "enum": ["uuid4", "uuid1", "random_string", "password", "hash"],
                    "description": "Type of generation: uuid4, uuid1, random_string, password, or hash."
                },
                "length": {
                    "type": "integer",
                    "description": "Length for random_string or password (default 16)."
                },
                "count": {
                    "type": "integer",
                    "description": "Number of items to generate (default 1, max 10)."
                },
                "text": {
                    "type": "string",
                    "description": "Text to hash (for 'hash' type)."
                },
                "algorithm": {
                    "type": "string",
                    "enum": ["md5", "sha1", "sha256", "sha512"],
                    "description": "Hash algorithm (default sha256)."
                }
            },
            "required": ["type"]
        }

    async def execute(self, **kwargs) -> SkillResult:
        import time
        start = time.monotonic()
        gen_type = kwargs.get("type", "uuid4")
        length = max(4, min(128, int(kwargs.get("length", 16))))
        count = max(1, min(10, int(kwargs.get("count", 1))))

        try:
            if gen_type == "uuid4":
                items = [str(uuid.uuid4()) for _ in range(count)]
                result = f"**Generated UUID v4 ({count}):**\n" + "\n".join(f"`{x}`" for x in items)

            elif gen_type == "uuid1":
                items = [str(uuid.uuid1()) for _ in range(count)]
                result = f"**Generated UUID v1 ({count}):**\n" + "\n".join(f"`{x}`" for x in items)

            elif gen_type == "random_string":
                charset = string.ascii_letters + string.digits
                items = ["".join(secrets.choice(charset) for _ in range(length)) for _ in range(count)]
                result = f"**Random Strings ({count}, length {length}):**\n" + "\n".join(f"`{x}`" for x in items)

            elif gen_type == "password":
                charset = string.ascii_letters + string.digits + "!@#$%^&*()-_=+[]{}|"
                items = ["".join(secrets.choice(charset) for _ in range(length)) for _ in range(count)]
                result = f"**Secure Passwords ({count}, length {length}):**\n" + "\n".join(f"`{x}`" for x in items)

            elif gen_type == "hash":
                text = kwargs.get("text", "")
                algorithm = kwargs.get("algorithm", "sha256")
                if not text:
                    return SkillResult(success=False, data=None, skill_name=self.name, error="No text provided for hashing.")
                h = hashlib.new(algorithm, text.encode("utf-8")).hexdigest()
                result = f"**{algorithm.upper()} Hash**\nInput: `{text[:50]}{'...' if len(text) > 50 else ''}`\nHash: `{h}`"

            else:
                return SkillResult(success=False, data=None, skill_name=self.name, error=f"Unknown type: {gen_type}")

            elapsed = (time.monotonic() - start) * 1000
            return SkillResult(success=True, data=result, skill_name=self.name, execution_time_ms=elapsed)

        except Exception as e:
            elapsed = (time.monotonic() - start) * 1000
            return SkillResult(success=False, data=None, skill_name=self.name, execution_time_ms=elapsed, error=str(e))
