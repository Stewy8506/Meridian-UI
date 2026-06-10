from typing import Dict, Tuple

# Price dictionary: (provider, model) -> (input_cost_per_m, output_cost_per_m)
# Prices in USD per 1 Million tokens.
MODEL_PRICING: Dict[Tuple[str, str], Tuple[float, float]] = {
    # OpenAI
    ("openai", "gpt-4o"): (2.50, 10.00),
    ("openai", "gpt-4o-mini"): (0.150, 0.600),
    ("openai", "gpt-4-turbo"): (10.00, 30.00),
    ("openai", "gpt-3.5-turbo"): (0.50, 1.50),
    
    # Anthropic
    ("anthropic", "claude-3-5-sonnet-latest"): (3.00, 15.00),
    ("anthropic", "claude-3-5-sonnet-20241022"): (3.00, 15.00),
    ("anthropic", "claude-3-5-haiku-latest"): (0.80, 4.00),
    ("anthropic", "claude-3-opus-latest"): (15.00, 75.00),
    
    # Google
    ("google", "gemini-1.5-pro"): (1.25, 5.00),
    ("google", "gemini-1.5-flash"): (0.075, 0.30),
    
    # DeepSeek
    ("deepseek", "deepseek-chat"): (0.14, 0.28),
    ("deepseek", "deepseek-coder"): (0.14, 0.28),
}

def calculate_token_cost(provider: str, model: str, input_tokens: int, output_tokens: int) -> float:
    """
    Calculate the estimated cost of an inference in USD.
    """
    provider_key = provider.lower()
    model_key = model.lower()
    
    # Check exact match
    price = MODEL_PRICING.get((provider_key, model_key))
    if not price:
        # Check if the model name is contained within the pricing keys
        for (p, m), (in_p, out_p) in MODEL_PRICING.items():
            if p == provider_key and m in model_key:
                price = (in_p, out_p)
                break
                
    if price:
        input_cost = (input_tokens / 1_000_000.0) * price[0]
        output_cost = (output_tokens / 1_000_000.0) * price[1]
        return input_cost + output_cost
        
    # Default fallback: free for local environments
    if provider_key in ["local", "ollama"]:
        return 0.0
        
    # Default average pricing for unknown external commercial APIs
    price = (0.50, 1.50)
    input_cost = (input_tokens / 1_000_000.0) * price[0]
    output_cost = (output_tokens / 1_000_000.0) * price[1]
    return input_cost + output_cost
