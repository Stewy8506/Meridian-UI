import logging
from typing import List, Dict, Any, Optional
from app.rag.embeddings import embedding_generator
from app.rag.vector_store import vector_store

logger = logging.getLogger("app.rag.retriever")

class Retriever:
    @staticmethod
    def retrieve_context(
        query: str,
        collection_names: List[str],
        top_k: int = 5,
        api_key: Optional[str] = None,
        provider: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top_k relevant text chunks from the vector store 
        across the specified collection names, sorted by semantic similarity.
        """
        if not query or not collection_names:
            return []

        try:
            # 1. Compute query vector representation
            query_vector = embedding_generator.get_embedding(query, api_key=api_key, provider=provider)
            
            all_chunks = []
            for col_name in collection_names:
                try:
                    # Query this collection
                    chunks = vector_store.query(col_name, query_vector, n_results=top_k)
                    all_chunks.extend(chunks)
                except Exception as e:
                    logger.error(f"Error querying collection '{col_name}': {e}")
            
            # 2. Deduplicate and sort by distance ascending (lower distance is better)
            seen_ids = set()
            unique_chunks = []
            for chunk in all_chunks:
                if chunk["id"] not in seen_ids:
                    seen_ids.add(chunk["id"])
                    unique_chunks.append(chunk)
            
            unique_chunks.sort(key=lambda x: x["distance"])
            
            # Return top-K matches
            return unique_chunks[:top_k]
        except Exception as e:
            logger.error(f"Failed to retrieve context for query: {e}")
            return []

    @staticmethod
    def format_context(results: List[Dict[str, Any]]) -> str:
        """
        Formats retrieved semantic search results into a clean, XML-like structured 
        context block that can be easily injected into prompt instructions.
        """
        if not results:
            return ""

        context_lines = [
            "=================================================================",
            "CONTEXT FROM ATTACHED DOCUMENTS & KNOWLEDGE SOURCES:",
            "Use the following excerpts to answer the prompt.",
            "Always prefer information below over general pre-trained knowledge.",
            "Cite document names when providing answers.",
            "================================================================="
        ]

        for idx, result in enumerate(results):
            source = result["metadata"].get("filename", f"source_{idx}")
            chunk_idx = result["metadata"].get("chunk_index", idx)
            text = result["text"]
            
            context_lines.append(f"\n[Source Document: {source} (Excerpt #{chunk_idx})]")
            context_lines.append("-----------------------------------------------------------------")
            context_lines.append(text)
            context_lines.append("-----------------------------------------------------------------")

        context_lines.append("\n=================================================================")
        return "\n".join(context_lines)
