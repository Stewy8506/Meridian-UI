import os
import subprocess
import tempfile
import logging
from typing import Dict, Any

logger = logging.getLogger("app.sandbox.executor")

class CodeExecutor:
    def __init__(self, timeout: int = 30):
        self.timeout = timeout

    def execute_python(self, code: str) -> Dict[str, Any]:
        """
        Execute Python code in a local subprocess.
        WARNING: This is a basic implementation without strict isolation.
        """
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(code)
                script_path = f.name

            # Run the script
            result = subprocess.run(
                ["python", script_path],
                capture_output=True,
                text=True,
                timeout=self.timeout
            )
            
            # Clean up
            try:
                os.remove(script_path)
            except Exception:
                pass
                
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "stdout": "",
                "stderr": f"Execution timed out after {self.timeout} seconds.",
                "exit_code": 124
            }
        except Exception as e:
            logger.error(f"Error executing python code: {e}")
            return {
                "success": False,
                "stdout": "",
                "stderr": str(e),
                "exit_code": 1
            }

code_executor = CodeExecutor()
