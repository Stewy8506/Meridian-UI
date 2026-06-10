from enum import Enum

class SkillCategory(str, Enum):
    WEB = "web"                      # Search, scrape, fetch
    CODE = "code"                    # Execute, lint, format, debug
    DATA = "data"                    # Parse, transform, visualize
    FILE = "file"                    # Read, write, convert
    IMAGE = "image"                  # Generate, edit, analyze
    AUDIO = "audio"                  # TTS, STT, music
    COMMUNICATION = "communication"  # Email, SMS, Slack
    KNOWLEDGE = "knowledge"          # RAG, embeddings, memory
    SYSTEM = "system"                # Canvas, workflows, internal
    UTILITY = "utility"              # Calculator, datetime, convert
