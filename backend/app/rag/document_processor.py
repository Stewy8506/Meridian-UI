import os
import json
import logging
from typing import List, Dict, Any

logger = logging.getLogger("app.rag.document_processor")

def split_text(text: str, chunk_size: int = 1500, chunk_overlap: int = 200) -> List[str]:
    """
    Partitions text into chunks of roughly chunk_size characters, 
    with chunk_overlap characters of overlapping context.
    Attempts to align splits to paragraph, sentence, or word boundaries.
    """
    if not text:
        return []
        
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        # Determine initial window end
        end = min(start + chunk_size, text_len)
        if end == text_len:
            chunks.append(text[start:])
            break
            
        # Try to locate clean splits (newlines, periods, spaces) inside window
        chunk_slice = text[start:end]
        
        last_paragraph = chunk_slice.rfind("\n\n")
        last_newline = chunk_slice.rfind("\n")
        last_period = chunk_slice.rfind(". ")
        last_space = chunk_slice.rfind(" ")
        
        # Decide split index based on highest quality boundary found in last 30% of window
        min_split_point = int(chunk_size * 0.7)
        
        if last_paragraph > min_split_point:
            split_idx = start + last_paragraph + 2
        elif last_newline > min_split_point:
            split_idx = start + last_newline + 1
        elif last_period > min_split_point:
            split_idx = start + last_period + 2
        elif last_space > min_split_point:
            split_idx = start + last_space + 1
        else:
            split_idx = end  # Hard split if no word boundary found
            
        chunks.append(text[start:split_idx])
        
        # Move forward, subtracting overlap
        start = split_idx - chunk_overlap
        # Safety boundary to ensure loop progression
        if start >= split_idx or chunk_overlap >= chunk_size:
            start = split_idx
            
    return [c.strip() for c in chunks if c.strip()]


class DocumentProcessor:
    @staticmethod
    def extract_text(file_path: str) -> str:
        """Parses a file and extracts raw text based on extension."""
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == ".txt":
            return DocumentProcessor._parse_txt(file_path)
        elif ext == ".md":
            return DocumentProcessor._parse_txt(file_path)
        elif ext == ".pdf":
            return DocumentProcessor._parse_pdf(file_path)
        elif ext in (".docx", ".doc"):
            return DocumentProcessor._parse_docx(file_path)
        elif ext == ".csv":
            return DocumentProcessor._parse_csv(file_path)
        elif ext == ".json":
            return DocumentProcessor._parse_json(file_path)
        else:
            raise ValueError(f"File extension '{ext}' is not supported.")

    @staticmethod
    def _parse_txt(path: str) -> str:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    @staticmethod
    def _parse_pdf(path: str) -> str:
        try:
            import fitz  # PyMuPDF
        except ImportError:
            raise ImportError(
                "PDF parsing library 'pymupdf' is not installed. "
                "Ensure it's installed via pip install pymupdf."
            )
            
        text = []
        try:
            with fitz.open(path) as doc:
                for page in doc:
                    page_text = page.get_text()
                    if page_text:
                        text.append(page_text)
            return "\n".join(text)
        except Exception as e:
            logger.error(f"Failed parsing PDF at '{path}': {e}")
            raise ValueError(f"Error parsing PDF file: {e}")

    @staticmethod
    def _parse_docx(path: str) -> str:
        try:
            import docx
        except ImportError:
            raise ImportError(
                "Word Document parsing library 'python-docx' is not installed. "
                "Ensure it's installed via pip install python-docx."
            )
            
        try:
            doc = docx.Document(path)
            paragraphs = [p.text for p in doc.paragraphs if p.text]
            return "\n".join(paragraphs)
        except Exception as e:
            logger.error(f"Failed parsing Word Document at '{path}': {e}")
            raise ValueError(f"Error parsing Word Document: {e}")

    @staticmethod
    def _parse_csv(path: str) -> str:
        import csv
        rows = []
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                reader = csv.reader(f)
                for row in reader:
                    if row:
                        rows.append(" | ".join(row))
            return "\n".join(rows)
        except Exception as e:
            logger.error(f"Failed parsing CSV at '{path}': {e}")
            raise ValueError(f"Error parsing CSV: {e}")

    @staticmethod
    def _parse_json(path: str) -> str:
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                data = json.load(f)
                return json.dumps(data, indent=2)
        except Exception as e:
            logger.error(f"Failed parsing JSON at '{path}': {e}")
            raise ValueError(f"Error parsing JSON: {e}")

    @staticmethod
    def process_file(file_path: str, chunk_size: int = 1500, chunk_overlap: int = 200) -> List[str]:
        """Reads a file, extracts its text, and returns overlapping chunks."""
        text = DocumentProcessor.extract_text(file_path)
        return split_text(text, chunk_size, chunk_overlap)
