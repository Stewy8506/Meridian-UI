import asyncio
import sys
import os

# Add the backend app folder to sys.path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "app")))
# Or add backend to path:
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.tools.web_search import WebSearchTool
from app.core.config import settings

async def main():
    print("Testing WebSearchTool implementation...")
    print(f"TAVILY_API_KEY set: {settings.TAVILY_API_KEY is not None}")
    print(f"EXA_API_KEY set: {settings.EXA_API_KEY is not None}")
    
    # We will test both providers
    tool = WebSearchTool()
    query = "Google DeepMind Gemini 3.5"
    
    print("\n--- Testing Tavily Mock/Real Execution ---")
    if not settings.TAVILY_API_KEY:
        print("TAVILY_API_KEY is not set. Temporarily setting a dummy key to test format/error handling.")
        settings.TAVILY_API_KEY = "dummy-key"
    
    res_tavily = await tool.execute(query=query, search_provider="tavily")
    print(f"Tavily result:\n{res_tavily[:1000]}")
    
    print("\n--- Testing Exa Mock/Real Execution ---")
    if not settings.EXA_API_KEY:
        print("EXA_API_KEY is not set. Temporarily setting a dummy key to test format/error handling.")
        settings.EXA_API_KEY = "dummy-key"
        
    res_exa = await tool.execute(query=query, search_provider="exa")
    print(f"Exa result:\n{res_exa[:1000]}")

if __name__ == "__main__":
    asyncio.run(main())
