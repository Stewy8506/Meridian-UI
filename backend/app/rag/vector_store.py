import os
import json
import logging
import sqlite3
from typing import List, Dict, Any, Optional, Tuple
from app.core.config import settings

logger = logging.getLogger("app.rag.vector_store")

class SQLiteVectorStore:
    """
    Self-contained, native Python vector store fallback.
    Saves document chunks and embeddings in a local SQLite file, performing
    cosine similarity in memory. Extremely stable and cross-platform.
    """
    def __init__(self, db_path: str = "workspace_vectors.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS vector_chunks (
                    id TEXT PRIMARY KEY,
                    collection_name TEXT,
                    text TEXT,
                    metadata_json TEXT,
                    embedding_json TEXT
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_collection ON vector_chunks(collection_name)")
            conn.commit()

    def add_documents(
        self, 
        collection_name: str, 
        texts: List[str], 
        metadatas: List[Dict[str, Any]], 
        ids: List[str], 
        embeddings: List[List[float]]
    ):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            for idx, doc_id in enumerate(ids):
                meta_str = json.dumps(metadatas[idx]) if idx < len(metadatas) else "{}"
                embed_str = json.dumps(embeddings[idx])
                text = texts[idx]
                
                cursor.execute(
                    "INSERT OR REPLACE INTO vector_chunks (id, collection_name, text, metadata_json, embedding_json) VALUES (?, ?, ?, ?, ?)",
                    (doc_id, collection_name, text, meta_str, embed_str)
                )
            conn.commit()

    def query(
        self, 
        collection_name: str, 
        query_embedding: List[float], 
        n_results: int = 5
    ) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, text, metadata_json, embedding_json FROM vector_chunks WHERE collection_name = ?",
                (collection_name,)
            )
            rows = cursor.fetchall()
            
        if not rows:
            return []
            
        # Perform in-memory cosine similarity
        results = []
        for doc_id, text, metadata_json, embedding_json in rows:
            try:
                emb = json.loads(embedding_json)
                meta = json.loads(metadata_json)
                
                # Cosine similarity math
                dot_product = sum(a * b for a, b in zip(query_embedding, emb))
                mag_a = sum(a * a for a in query_embedding) ** 0.5
                mag_b = sum(b * b for b in emb) ** 0.5
                
                similarity = 0.0
                if mag_a * mag_b > 0:
                    similarity = dot_product / (mag_a * mag_b)
                
                results.append({
                    "id": doc_id,
                    "text": text,
                    "metadata": meta,
                    "distance": 1.0 - similarity  # Distance representation (smaller distance = closer)
                })
            except Exception as e:
                logger.error(f"Error parsing fallback vector chunk: {e}")
                
        # Sort by distance ascending (similarity descending)
        results.sort(key=lambda x: x["distance"])
        return results[:n_results]

    def delete_documents(self, collection_name: str, ids: List[str]):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            for doc_id in ids:
                cursor.execute(
                    "DELETE FROM vector_chunks WHERE collection_name = ? AND id = ?",
                    (collection_name, doc_id)
                )
            conn.commit()

    def delete_collection(self, collection_name: str):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM vector_chunks WHERE collection_name = ?", (collection_name,))
            conn.commit()


class VectorStoreManager:
    """
    Manages vector storage operations, abstracting ChromaDB and falling back 
    to SQLiteVectorStore if ChromaDB is unavailable or throws SQLite version errors.
    """
    def __init__(self, chroma_path: str = "workspace_chroma", fallback_db: str = "workspace_vectors.db"):
        self.chroma_path = chroma_path
        self.fallback_db = fallback_db
        self.client = None
        self.use_fallback = False
        self._initialized = False

    def initialize(self):
        if self._initialized:
            return
        self._init_backend()
        self._initialized = True

    def _init_backend(self):
        try:
            import chromadb
            # Disable telemetry and system collection tracking
            from chromadb.config import Settings as ChromaSettings
            
            logger.info("Initializing ChromaDBPersistentClient...")
            self.client = chromadb.PersistentClient(
                path=self.chroma_path,
                settings=ChromaSettings(anonymized_telemetry=False)
            )
            logger.info("ChromaDB initialized successfully.")
        except Exception as e:
            logger.warning(
                f"ChromaDB initialization failed: {e}. "
                "Switching to native SQLite vector store fallback."
            )
            self.use_fallback = True
            self.client = SQLiteVectorStore(self.fallback_db)

    def add_documents(
        self, 
        collection_name: str, 
        texts: List[str], 
        metadatas: List[Dict[str, Any]], 
        ids: List[str], 
        embeddings: List[List[float]]
    ):
        if self.client is None:
            self.initialize()
        assert self.client is not None
        
        if self.use_fallback:
            self.client.add_documents(collection_name, texts, metadatas, ids, embeddings)
            return

        try:
            # chroma collections are fetched or created
            collection = self.client.get_or_create_collection(name=collection_name)
            collection.add(
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
                ids=ids
            )
        except Exception as e:
            logger.error(f"ChromaDB add failed: {e}. Attempting fallback vector storage...")
            # Dynamically switch to fallback if chroma crashes during operations
            self.use_fallback = True
            self.client = SQLiteVectorStore(self.fallback_db)
            self.client.add_documents(collection_name, texts, metadatas, ids, embeddings)

    def query(
        self, 
        collection_name: str, 
        query_embedding: List[float], 
        n_results: int = 5
    ) -> List[Dict[str, Any]]:
        if self.client is None:
            self.initialize()
        assert self.client is not None
        
        if self.use_fallback:
            return self.client.query(collection_name, query_embedding, n_results)

        try:
            collection = self.client.get_collection(name=collection_name)
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results
            )
            
            # Format to a unified response format
            formatted = []
            if results and results["documents"]:
                docs = results["documents"][0]
                metas = results["metadatas"][0] if results["metadatas"] else [{}] * len(docs)
                ids = results["ids"][0]
                distances = results["distances"][0] if results["distances"] else [0.0] * len(docs)
                
                for idx, doc in enumerate(docs):
                    formatted.append({
                        "id": ids[idx],
                        "text": doc,
                        "metadata": metas[idx] or {},
                        "distance": distances[idx]
                    })
            return formatted
        except Exception as e:
            logger.error(f"ChromaDB query failed for collection '{collection_name}': {e}. Using fallback...")
            fallback_store = SQLiteVectorStore(self.fallback_db)
            return fallback_store.query(collection_name, query_embedding, n_results)

    def delete_documents(self, collection_name: str, ids: List[str]):
        if self.client is None:
            self.initialize()
        assert self.client is not None
        
        if self.use_fallback:
            self.client.delete_documents(collection_name, ids)
            return

        try:
            collection = self.client.get_collection(name=collection_name)
            collection.delete(ids=ids)
        except Exception as e:
            logger.error(f"ChromaDB delete failed: {e}")

    def delete_collection(self, collection_name: str):
        if self.client is None:
            self.initialize()
        assert self.client is not None
        
        if self.use_fallback:
            self.client.delete_collection(collection_name)
            return

        try:
            self.client.delete_collection(name=collection_name)
        except Exception as e:
            logger.error(f"ChromaDB delete collection failed: {e}")

# Global singleton manager
vector_store = VectorStoreManager()
