from dataclasses import dataclass, field
from typing import Dict, Any, Optional

@dataclass
class ProviderConfig:
    id: str
    name: str
    icon: str
    base_url: str
    api_key_env: str
    adapter: str  # "openai_compatible" | "anthropic" | "cohere" | "bedrock" | "azure"
    supports_streaming: bool = True
    supports_vision: bool = False
    supports_tool_calling: bool = True
    model_list_endpoint: str = "/models"
    default_model: str = ""
    quirks: Dict[str, Any] = field(default_factory=dict)

PROVIDERS_CONFIG: Dict[str, ProviderConfig] = {
    "local": ProviderConfig(
        id="local",
        name="LM Studio (Local)",
        icon="cpu",
        base_url="http://localhost:1234/v1",
        api_key_env="LOCAL_API_KEY",
        adapter="openai_compatible",
        supports_tool_calling=True,
        supports_vision=True,
        default_model="qwen-2.5-7b-instruct"
    ),
    "ollama": ProviderConfig(
        id="ollama",
        name="Ollama (Local)",
        icon="cpu",
        base_url="http://localhost:11434/v1",
        api_key_env="OLLAMA_API_KEY",
        adapter="openai_compatible",
        supports_tool_calling=True,
        supports_vision=True,
        default_model="llama3"
    ),
    "openai": ProviderConfig(
        id="openai",
        name="OpenAI",
        icon="openai",
        base_url="https://api.openai.com/v1",
        api_key_env="OPENAI_API_KEY",
        adapter="openai_compatible",
        supports_vision=True,
        supports_tool_calling=True,
        default_model="gpt-4o"
    ),
    "anthropic": ProviderConfig(
        id="anthropic",
        name="Anthropic",
        icon="anthropic",
        base_url="https://api.anthropic.com/v1",
        api_key_env="ANTHROPIC_API_KEY",
        adapter="anthropic",
        supports_vision=True,
        supports_tool_calling=True,
        default_model="claude-3-5-sonnet-latest"
    ),
    "google": ProviderConfig(
        id="google",
        name="Google Gemini",
        icon="google",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai",
        api_key_env="GOOGLE_API_KEY",
        adapter="openai_compatible",
        supports_vision=True,
        supports_tool_calling=True,
        default_model="gemini-2.5-flash"
    ),
    "groq": ProviderConfig(
        id="groq",
        name="Groq",
        icon="zap",
        base_url="https://api.groq.com/openai/v1",
        api_key_env="GROQ_API_KEY",
        adapter="openai_compatible",
        supports_tool_calling=True,
        default_model="llama-3.3-70b-versatile"
    ),
    "together": ProviderConfig(
        id="together",
        name="Together AI",
        icon="network",
        base_url="https://api.together.xyz/v1",
        api_key_env="TOGETHER_API_KEY",
        adapter="openai_compatible",
        default_model="meta-llama/Llama-3-70b-chat-hf"
    ),
    "fireworks": ProviderConfig(
        id="fireworks",
        name="Fireworks AI",
        icon="sparkles",
        base_url="https://api.fireworks.ai/inference/v1",
        api_key_env="FIREWORKS_API_KEY",
        adapter="openai_compatible",
        default_model="accounts/fireworks/models/llama-v3-70b-instruct"
    ),
    "mistral": ProviderConfig(
        id="mistral",
        name="Mistral AI",
        icon="wind",
        base_url="https://api.mistral.ai/v1",
        api_key_env="MISTRAL_API_KEY",
        adapter="openai_compatible",
        default_model="mistral-large-latest"
    ),
    "cohere": ProviderConfig(
        id="cohere",
        name="Cohere",
        icon="compass",
        base_url="https://api.cohere.com/v2",
        api_key_env="COHERE_API_KEY",
        adapter="cohere",
        default_model="command-r-plus"
    ),
    "deepseek": ProviderConfig(
        id="deepseek",
        name="DeepSeek",
        icon="eye",
        base_url="https://api.deepseek.com/v1",
        api_key_env="DEEPSEEK_API_KEY",
        adapter="openai_compatible",
        default_model="deepseek-chat"
    ),
    "openrouter": ProviderConfig(
        id="openrouter",
        name="OpenRouter",
        icon="globe",
        base_url="https://openrouter.ai/api/v1",
        api_key_env="OPENROUTER_API_KEY",
        adapter="openai_compatible",
        default_model="meta-llama/llama-3-8b-instruct:free",
        quirks={"needs_extra_headers": True}
    ),
    "perplexity": ProviderConfig(
        id="perplexity",
        name="Perplexity",
        icon="search",
        base_url="https://api.perplexity.ai",
        api_key_env="PERPLEXITY_API_KEY",
        adapter="openai_compatible",
        default_model="sonar"
    ),
    "xai": ProviderConfig(
        id="xai",
        name="xAI Grok",
        icon="terminal",
        base_url="https://api.x.ai/v1",
        api_key_env="XAI_API_KEY",
        adapter="openai_compatible",
        default_model="grok-beta"
    ),
    "deepinfra": ProviderConfig(
        id="deepinfra",
        name="DeepInfra",
        icon="server",
        base_url="https://api.deepinfra.com/v1/openai",
        api_key_env="DEEPINFRA_API_KEY",
        adapter="openai_compatible",
        default_model="meta-llama/Meta-Llama-3-70B-Instruct"
    ),
    "siliconflow": ProviderConfig(
        id="siliconflow",
        name="SiliconFlow",
        icon="database",
        base_url="https://api.siliconflow.cn/v1",
        api_key_env="SILICONFLOW_API_KEY",
        adapter="openai_compatible",
        default_model="vendor/meta-llama/Meta-Llama-3-8B-Instruct"
    ),
    "cerebras": ProviderConfig(
        id="cerebras",
        name="Cerebras",
        icon="zap",
        base_url="https://api.cerebras.ai/v1",
        api_key_env="CEREBRAS_API_KEY",
        adapter="openai_compatible",
        default_model="llama3.1-70b"
    ),
    "sambanova": ProviderConfig(
        id="sambanova",
        name="SambaNova",
        icon="cpu",
        base_url="https://api.sambanova.ai/v1",
        api_key_env="SAMBANOVA_API_KEY",
        adapter="openai_compatible",
        default_model="Meta-Llama-3.1-70B-Instruct"
    ),
    "lepton": ProviderConfig(
        id="lepton",
        name="Lepton AI",
        icon="cpu",
        base_url="https://api.lepton.ai/v1",
        api_key_env="LEPTON_API_KEY",
        adapter="openai_compatible",
        default_model="llama3-8b"
    ),
    "novita": ProviderConfig(
        id="novita",
        name="Novita AI",
        icon="cloud",
        base_url="https://api.novita.ai/v3/openai",
        api_key_env="NOVITA_API_KEY",
        adapter="openai_compatible",
        default_model="meta-llama/llama-3-70b-instruct"
    ),
    "huggingface": ProviderConfig(
        id="huggingface",
        name="HuggingFace Hub",
        icon="smile",
        base_url="https://api-inference.huggingface.co/v1",
        api_key_env="HUGGINGFACE_API_KEY",
        adapter="openai_compatible",
        default_model="meta-llama/Meta-Llama-3-8B-Instruct"
    ),
    "bedrock": ProviderConfig(
        id="bedrock",
        name="AWS Bedrock",
        icon="cloud-lightning",
        base_url="bedrock",
        api_key_env="AWS_SECRET_ACCESS_KEY",
        adapter="bedrock",
        default_model="anthropic.claude-3-sonnet-20240229-v1:0"
    ),
    "azure": ProviderConfig(
        id="azure",
        name="Azure OpenAI",
        icon="cloud",
        base_url="azure",
        api_key_env="AZURE_OPENAI_API_KEY",
        adapter="azure",
        default_model="gpt-35-turbo"
    ),
    "cloudflare": ProviderConfig(
        id="cloudflare",
        name="Cloudflare Workers AI",
        icon="cloud-rain",
        base_url="https://api.cloudflare.com/client/v4/accounts",
        api_key_env="CLOUDFLARE_API_TOKEN",
        adapter="openai_compatible",
        default_model="@cf/meta/llama-3-8b-instruct"
    ),
    "ai21": ProviderConfig(
        id="ai21",
        name="AI21 Studio",
        icon="cpu",
        base_url="https://api.ai21.com/studio/v1",
        api_key_env="AI21_API_KEY",
        adapter="openai_compatible",
        default_model="jamba-1.5-mini"
    )
}
