from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Meridian UI API"
    VERSION: str = "1.0.0"
    
    # Provider API Keys
    GOOGLE_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    GROQ_API_KEY: str | None = None
    TOGETHER_API_KEY: str | None = None
    FIREWORKS_API_KEY: str | None = None
    MISTRAL_API_KEY: str | None = None
    COHERE_API_KEY: str | None = None
    DEEPSEEK_API_KEY: str | None = None
    OPENROUTER_API_KEY: str | None = None
    PERPLEXITY_API_KEY: str | None = None
    XAI_API_KEY: str | None = None
    DEEPINFRA_API_KEY: str | None = None
    SILICONFLOW_API_KEY: str | None = None
    CEREBRAS_API_KEY: str | None = None
    SAMBANOVA_API_KEY: str | None = None
    LEPTON_API_KEY: str | None = None
    NOVITA_API_KEY: str | None = None
    HUGGINGFACE_API_KEY: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    AZURE_OPENAI_API_KEY: str | None = None
    CLOUDFLARE_API_TOKEN: str | None = None
    AI21_API_KEY: str | None = None
    LOCAL_API_KEY: str | None = None
    OLLAMA_API_KEY: str | None = None
    
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
