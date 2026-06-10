import logging
from typing import List, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("app.rag.embeddings")

class EmbeddingGenerator:
    """
    Generates embedding vectors (dimension 384 for sentence-transformers, or 1536 for OpenAI).
    Resilient to import or load failures on Windows environments.
    """
    def __init__(self):
        self.local_model = None
        self._init_local_model()

    def _init_local_model(self):
        try:
            from sentence_transformers import SentenceTransformer
            # Suppress hugginface warnings about progress bars/downloads
            logger.info("Initializing local SentenceTransformer model 'all-MiniLM-L6-v2'...")
            self.local_model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("Local SentenceTransformer initialized successfully.")
        except Exception as e:
            logger.warning(
                f"Could not load local sentence-transformers model: {e}. "
                "Will fall back to cloud embedding APIs or manual word vectors."
            )
            self.local_model = None

    def get_dimension(self) -> int:
        if self.local_model:
            return 384
        return 1536  # Default dimension for OpenAI / cloud embeddings

    def get_embedding(self, text: str, api_key: Optional[str] = None, provider: Optional[str] = None) -> List[float]:
        return self.get_embeddings([text], api_key=api_key, provider=provider)[0]

    def get_embeddings(self, texts: List[str], api_key: Optional[str] = None, provider: Optional[str] = None) -> List[List[float]]:
        # 1. Try local SentenceTransformer if loaded
        if self.local_model:
            try:
                embeddings = self.local_model.encode(texts)
                return [val.tolist() for val in embeddings]
            except Exception as e:
                logger.error(f"Error generating local embeddings: {e}. Attempting fallback...")

        # 2. Try OpenAI Embeddings if key available or provider matches
        openai_key = api_key if provider == "openai" else getattr(settings, "OPENAI_API_KEY", None)
        if openai_key and openai_key != "not-needed":
            try:
                logger.info("Generating embeddings via OpenAI API...")
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {openai_key}"
                }
                payload = {
                    "input": texts,
                    "model": "text-embedding-3-small"
                }
                with httpx.Client() as client:
                    response = client.post("https://api.openai.com/v1/embeddings", json=payload, headers=headers, timeout=20.0)
                    if response.status_code == 200:
                        data = response.json()
                        return [item["embedding"] for item in data["data"]]
                    else:
                        logger.error(f"OpenAI embedding API failed with code {response.status_code}: {response.text}")
            except Exception as e:
                logger.error(f"Error generating OpenAI embeddings: {e}")

        # 3. Try Gemini Embeddings if key available
        gemini_key = api_key if provider == "google" else getattr(settings, "GOOGLE_API_KEY", None)
        if gemini_key and gemini_key != "not-needed":
            try:
                logger.info("Generating embeddings via Gemini API...")
                # Gemini text embeddings endpoint uses v1beta text embeddings
                results = []
                with httpx.Client() as client:
                    for text in texts:
                        url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={gemini_key}"
                        payload = {
                            "model": "models/text-embedding-004",
                            "content": {
                                "parts": [{"text": text}]
                            }
                        }
                        response = client.post(url, json=payload, timeout=15.0)
                        if response.status_code == 200:
                            data = response.json()
                            results.append(data["embedding"]["values"])
                        else:
                            logger.error(f"Gemini embedding API failed with code {response.status_code}: {response.text}")
                            break
                if len(results) == len(texts):
                    return results
            except Exception as e:
                logger.error(f"Error generating Gemini embeddings: {e}")

        # 4. Final resilient fallback: Simple normalized term vector (deterministic)
        # Returns a normalized tf-idf-like vector padded to 384 dimensions
        logger.warning("All premium embedding routes failed. Falling back to lightweight word-hash embeddings.")
        return [self._hash_embedding(t, 384) for t in texts]

    def _hash_embedding(self, text: str, dim: int = 384) -> List[float]:
        """Resilient, deterministic character-hash pseudo-embedding for text similarity fallback."""
        import math
        import hashlib
        
        words = text.lower().split()
        if not words:
            return [0.0] * dim
            
        vector = [0.0] * dim
        for word in words:
            # Hash word to determine dimension bucket and sign
            h = int(hashlib.md5(word.encode('utf-8')).hexdigest(), 16)
            bucket = h % dim
            val = 1.0 if (h & 1) else -1.0
            vector[bucket] += val
            
        # Normalize vector
        sq_sum = sum(v * v for v in vector)
        if sq_sum > 0:
            norm = math.sqrt(sq_sum)
            vector = [v / norm for v in vector]
        return vector

# Global singleton instance
embedding_generator = EmbeddingGenerator()
