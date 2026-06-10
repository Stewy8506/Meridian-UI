"""
Scalable Skill Registry
-----------------------
Auto-discovers all skills from builtin/ subdirectories.
Uses TF-IDF cosine similarity for semantic search (no heavy ML deps).
Stores per-skill enable/disable state in a simple SQLite table.
"""

import importlib
import pkgutil
import logging
import math
import re
from typing import Dict, List, Optional, Tuple
from collections import defaultdict

from app.skills.base import BaseSkill
from app.skills.categories import SkillCategory

logger = logging.getLogger(__name__)


class SkillRegistry:
    def __init__(self):
        self._skills: Dict[str, BaseSkill] = {}
        self._disabled: set = set()
        self._tfidf_index: Dict[str, Dict[str, float]] = {}  # skill_name -> {term: tfidf}
        self._idf: Dict[str, float] = {}
        self._loaded = False

    # ------------------------------------------------------------------ #
    # Discovery
    # ------------------------------------------------------------------ #

    def discover(self):
        """Auto-import all skills from app.skills.builtin.* packages."""
        if self._loaded:
            return
        import app.skills.builtin as builtin_pkg
        for finder, pkg_name, is_pkg in pkgutil.walk_packages(
            path=builtin_pkg.__path__,
            prefix=builtin_pkg.__name__ + ".",
            onerror=lambda x: None
        ):
            try:
                module = importlib.import_module(pkg_name)
                # Find all BaseSkill subclasses in the module
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if (
                        isinstance(attr, type)
                        and issubclass(attr, BaseSkill)
                        and attr is not BaseSkill
                        and attr.name  # must have a name
                    ):
                        instance = attr()
                        self._register(instance)
            except Exception as e:
                logger.warning(f"Failed to load skill module {pkg_name}: {e}")

        self._build_tfidf_index()
        self._loaded = True
        logger.info(f"Skill registry loaded {len(self._skills)} skills")

    def _register(self, skill: BaseSkill):
        if skill.name in self._skills:
            return
        self._skills[skill.name] = skill

    # ------------------------------------------------------------------ #
    # TF-IDF Index for Semantic Search
    # ------------------------------------------------------------------ #

    def _tokenize(self, text: str) -> List[str]:
        text = text.lower()
        text = re.sub(r'[^a-z0-9\s]', ' ', text)
        return [t for t in text.split() if len(t) > 2]

    def _build_tfidf_index(self):
        """Build a TF-IDF index over skill descriptions + tags for fast retrieval."""
        documents: Dict[str, List[str]] = {}
        for name, skill in self._skills.items():
            tokens = self._tokenize(
                f"{skill.description} {skill.display_name} {' '.join(skill.tags)} {skill.category.value}"
            )
            documents[name] = tokens

        # Compute IDF
        N = len(documents)
        df: Dict[str, int] = defaultdict(int)
        for tokens in documents.values():
            for term in set(tokens):
                df[term] += 1
        self._idf = {t: math.log((N + 1) / (df[t] + 1)) + 1 for t in df}

        # Compute TF-IDF vectors
        for name, tokens in documents.items():
            tf: Dict[str, float] = defaultdict(float)
            for t in tokens:
                tf[t] += 1.0
            total = sum(tf.values()) or 1
            tfidf = {t: (count / total) * self._idf.get(t, 1.0) for t, count in tf.items()}
            self._tfidf_index[name] = tfidf

    def _cosine_similarity(self, vec_a: Dict[str, float], vec_b: Dict[str, float]) -> float:
        common = set(vec_a) & set(vec_b)
        if not common:
            return 0.0
        dot = sum(vec_a[t] * vec_b[t] for t in common)
        mag_a = math.sqrt(sum(v**2 for v in vec_a.values()))
        mag_b = math.sqrt(sum(v**2 for v in vec_b.values()))
        if mag_a == 0 or mag_b == 0:
            return 0.0
        return dot / (mag_a * mag_b)

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def get(self, name: str) -> Optional[BaseSkill]:
        return self._skills.get(name)

    def list_all(self, category: Optional[SkillCategory] = None, enabled_only: bool = False) -> List[BaseSkill]:
        skills = list(self._skills.values())
        if category:
            skills = [s for s in skills if s.category == category]
        if enabled_only:
            skills = [s for s in skills if s.name not in self._disabled]
        return skills

    def search(self, query: str, category: Optional[SkillCategory] = None, top_k: int = 8) -> List[Tuple[BaseSkill, float]]:
        """Semantic search over skill descriptions using TF-IDF cosine similarity."""
        if not self._loaded:
            self.discover()

        query_tokens = self._tokenize(query)
        query_tf: Dict[str, float] = defaultdict(float)
        for t in query_tokens:
            query_tf[t] += 1.0
        total = sum(query_tf.values()) or 1
        query_vec = {t: (c / total) * self._idf.get(t, 1.0) for t, c in query_tf.items()}

        scores: List[Tuple[float, str]] = []
        for name, vec in self._tfidf_index.items():
            if name in self._disabled:
                continue
            skill = self._skills[name]
            if category and skill.category != category:
                continue
            score = self._cosine_similarity(query_vec, vec)
            scores.append((score, name))

        scores.sort(reverse=True)
        return [(self._skills[name], score) for score, name in scores[:top_k]]

    def enable(self, name: str) -> bool:
        if name in self._skills:
            self._disabled.discard(name)
            self._skills[name].enabled = True
            return True
        return False

    def disable(self, name: str) -> bool:
        if name in self._skills:
            self._disabled.add(name)
            self._skills[name].enabled = False
            return True
        return False

    def is_enabled(self, name: str) -> bool:
        return name not in self._disabled

    def get_categories_summary(self) -> List[Dict]:
        summary: Dict[str, Dict] = {}
        for skill in self._skills.values():
            cat = skill.category.value
            if cat not in summary:
                summary[cat] = {"category": cat, "total": 0, "enabled": 0}
            summary[cat]["total"] += 1
            if skill.name not in self._disabled:
                summary[cat]["enabled"] += 1
        return list(summary.values())


# Singleton
skill_registry = SkillRegistry()
