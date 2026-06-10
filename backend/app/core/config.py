from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Workspace API"
    VERSION: str = "1.0.0"
    
    # Provider API Keys
    GOOGLE_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    
    # Search Engine API Keys
    TAVILY_API_KEY: str | None = None
    EXA_API_KEY: str | None = None
    
    # Local Provider Config
    LOCAL_PROVIDER_URL: str = "http://localhost:1234/v1" # LM Studio default
    
    # DB
    DATABASE_URL: str = "sqlite:///./workspace.db"

    # Auth & Security settings
    AUTH_ENABLED: bool = False
    AUTH_SECRET_KEY: str = "supersecretjwtkeyforlocaldevelopmentonly"
    ENCRYPTION_KEY: str | None = None
    
    # Skills settings
    SKILL_TOP_K: int = 8
    
    # Defaults
    DEFAULT_PROVIDER: str = "local"

    model_config = SettingsConfigDict(env_file=(".env", ".env.local"), case_sensitive=True)

settings = Settings()
