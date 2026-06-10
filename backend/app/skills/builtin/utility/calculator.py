"""
Calculator Skill
----------------
Safely evaluate math expressions using Python's math module.
"""
import math
import operator
import ast
from app.skills.base import BaseSkill, SkillResult
from app.skills.categories import SkillCategory


class CalculatorSkill(BaseSkill):
    name = "calculator"
    display_name = "Calculator"
    description = "Evaluate mathematical expressions, perform arithmetic, algebra, trigonometry, and scientific calculations safely."
    category = SkillCategory.UTILITY
    tags = ["math", "calculate", "arithmetic", "compute", "algebra", "trigonometry", "formula", "equation"]
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
                "expression": {
                    "type": "string",
                    "description": "The mathematical expression to evaluate (e.g. '2 ** 10', 'sin(pi/2)', 'sqrt(144)')."
                }
            },
            "required": ["expression"]
        }

    # Allowed names for safe evaluation
    _SAFE_NAMES = {
        name: getattr(math, name) for name in dir(math) if not name.startswith("_")
    }
    _SAFE_NAMES.update({
        "abs": abs, "round": round, "min": min, "max": max,
        "int": int, "float": float, "sum": sum, "pow": pow,
        "pi": math.pi, "e": math.e, "tau": math.tau,
        "inf": math.inf, "nan": math.nan
    })

    def _safe_eval(self, expression: str):
        """Safely evaluate a mathematical expression using AST parsing."""
        ALLOWED_NODES = (
            ast.Expression, ast.BinOp, ast.UnaryOp, ast.Constant,
            ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod,
            ast.Pow, ast.USub, ast.UAdd, ast.Call, ast.Name, ast.Attribute
        )
        try:
            tree = ast.parse(expression, mode='eval')
        except SyntaxError as e:
            raise ValueError(f"Invalid expression syntax: {e}")

        for node in ast.walk(tree):
            if not isinstance(node, ALLOWED_NODES):
                raise ValueError(f"Unsafe operation not allowed: {type(node).__name__}")

        return eval(compile(tree, '<string>', 'eval'), {"__builtins__": {}}, self._SAFE_NAMES)

    async def execute(self, **kwargs) -> SkillResult:
        import time
        start = time.monotonic()
        expression: str = kwargs.get("expression", "")

        if not expression:
            return SkillResult(success=False, data=None, skill_name=self.name, error="No expression provided.")

        try:
            result = self._safe_eval(expression.strip())
            elapsed = (time.monotonic() - start) * 1000

            if isinstance(result, float):
                if result == int(result) and abs(result) < 1e15:
                    formatted = str(int(result))
                else:
                    formatted = f"{result:.10g}"
            else:
                formatted = str(result)

            output = f"**{expression.strip()}** = **{formatted}**"
            return SkillResult(success=True, data=output, skill_name=self.name, execution_time_ms=elapsed)

        except Exception as e:
            elapsed = (time.monotonic() - start) * 1000
            return SkillResult(success=False, data=None, skill_name=self.name, execution_time_ms=elapsed, error=str(e))
