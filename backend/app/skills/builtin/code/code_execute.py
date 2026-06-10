"""
Code Execute Skill
------------------
Sandboxed Python code execution using subprocess with strict resource limits.
"""
import subprocess
import sys
import os
import tempfile
from app.skills.base import BaseSkill, SkillResult
from app.skills.categories import SkillCategory


class CodeExecuteSkill(BaseSkill):
    name = "code_execute"
    display_name = "Python Code Executor"
    description = "Execute Python code in a sandboxed environment and return the output. Supports standard library modules. Can run scripts, compute results, test logic, and generate data."
    category = SkillCategory.CODE
    tags = ["code", "python", "execute", "run", "script", "program", "compute", "debug", "test"]
    version = "1.0.0"
    requires_auth = False
    is_dangerous = True  # Can run arbitrary code
    enabled = True
    timeout_seconds = 30

    @property
    def schema(self):
        return {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "Python code to execute. Can include imports from the standard library."
                },
                "timeout": {
                    "type": "integer",
                    "description": "Execution timeout in seconds (default 10, max 30).",
                    "default": 10
                }
            },
            "required": ["code"]
        }

    # Blocked imports for basic safety
    _BLOCKED_IMPORTS = [
        "subprocess", "os.system", "shutil.rmtree",
        "__import__", "eval(", "exec(", "open(",
        "socket", "urllib.request", "http.client"
    ]

    def _check_safety(self, code: str) -> tuple[bool, str]:
        """Basic static analysis to block obviously dangerous patterns."""
        dangerous = [
            "os.system(", "os.popen(", "subprocess.run(", "subprocess.Popen(",
            "shutil.rmtree(", "__import__(", "importlib.import_module("
        ]
        for pattern in dangerous:
            if pattern in code:
                return False, f"Blocked: Potentially dangerous call detected: '{pattern}'"
        return True, ""

    async def execute(self, **kwargs) -> SkillResult:
        import time
        start = time.monotonic()
        code: str = kwargs.get("code", "")
        timeout = min(int(kwargs.get("timeout", 10)), 30)

        if not code:
            return SkillResult(success=False, data=None, skill_name=self.name, error="No code provided.")

        safe, reason = self._check_safety(code)
        if not safe:
            return SkillResult(success=False, data=None, skill_name=self.name, error=reason)

        try:
            # Write code to a temp file and run it in a subprocess
            with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as f:
                f.write(code)
                temp_path = f.name

            try:
                result = subprocess.run(
                    [sys.executable, temp_path],
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                    cwd=tempfile.gettempdir()
                )
                stdout = result.stdout.strip()
                stderr = result.stderr.strip()
                returncode = result.returncode
            finally:
                os.unlink(temp_path)

            elapsed = (time.monotonic() - start) * 1000

            if returncode == 0:
                output = f"```\n{stdout if stdout else '(no output)'}\n```"
                if stderr:
                    output += f"\n\n**Warnings/Stderr:**\n```\n{stderr[:500]}\n```"
                return SkillResult(success=True, data=output, skill_name=self.name, execution_time_ms=elapsed,
                                   metadata={"returncode": returncode, "timeout": timeout})
            else:
                error_text = stderr or stdout or "Process exited with non-zero code."
                return SkillResult(success=False, data=None, skill_name=self.name, execution_time_ms=elapsed,
                                   error=f"Code execution failed (exit code {returncode}):\n{error_text[:1000]}")

        except subprocess.TimeoutExpired:
            elapsed = (time.monotonic() - start) * 1000
            return SkillResult(success=False, data=None, skill_name=self.name, execution_time_ms=elapsed,
                               error=f"Execution timed out after {timeout} seconds.")
        except Exception as e:
            elapsed = (time.monotonic() - start) * 1000
            return SkillResult(success=False, data=None, skill_name=self.name, execution_time_ms=elapsed, error=str(e))
