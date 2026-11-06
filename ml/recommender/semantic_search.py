# ml/recommender/semantic_search.py

import pandas as pd
import numpy as np
import faiss                        # ← already imported in original; confirmed present
import os
import re
from sentence_transformers import SentenceTransformer
from typing import Optional

from ml.embeddings.faiss_index import load_index, search_index

MODELS_DIR    = "data/models"
PROCESSED_DIR = "data/processed"
SBERT_MODEL   = "all-MiniLM-L6-v2"

ATTRACTION_BUDGET_FRACTION = 0.25


def preprocess_preference_text(text: str, city: str) -> str:
    cleaned = text.lower().strip()
    cleaned = re.sub(r'\s+', ' ', cleaned)
    cleaned = re.sub(r'[^\w\s,.]', ' ', cleaned)

    filler_patterns = [
        r'\bi want to\b', r'\bi would like to\b', r'\bshow me\b',
        r'\bplease\b', r'\bcan you\b', r'\bi am looking for\b',
        r'\bi love\b', r'\bi like\b', r'\bi enjoy\b', r'\bi prefer\b',
        r'\bvisit\b', r'\bsee\b', r'\bexplore\b',
    ]
    for pattern in filler_patterns:
        cleaned = re.sub(pattern, '', cleaned)

    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return f"{cleaned} places to visit in {city} tourism attractions"


class AttractionRecommender:

    def __init__(self):
        self.model: Optional[SentenceTransformer] = None
        self.index = None
        self.attractions_df: Optional[pd.DataFrame] = None
        self._loaded = False
        self._model_loaded = False

    def load_model(self):
        """Load only Sentence-BERT without static FAISS or CSV files."""
        if self._model_loaded:
            return

        print("Loading Sentence-BERT model...")
        self.model = SentenceTransformer(SBERT_MODEL)
        self._model_loaded = True

        print("Sentence-BERT model loaded successfully.")

    def load(self):
        if self._loaded:
            return

        print("Loading AttractionRecommender...")

    # Load Sentence-BERT
        self.load_model()

    # Load static FAISS and CSV data
        self.index = load_index("attraction_index")

        self.attractions_df = pd.read_csv(
        os.path.join(PROCESSED_DIR, "attractions_featured.csv")
    )

        self.attractions_df["city_clean"] = (
        self.attractions_df["city"].astype(str).str.lower().str.strip()
    )

        self._loaded = True

        print(f"Loaded {len(self.attractions_df)} attractions")

    def _encode_user_preference(self, preference_text: str, city: str) -> np.ndarray:
        processed = preprocess_preference_text(preference_text, city)
        print(f"[SBERT] Encoding: {processed}")

        embedding = self.model.encode(
            [processed],
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )[0]

        return embedding.astype(np.float32)

    # ── EXISTING method — static CSV + prebuilt FAISS ─────────────────────
    # (unchanged from your current file)

    def recommend(
        self,
        city: str,
        preference_text: str,
        budget_per_day_inr: float,
        duration_days: int = 3,
        top_k: int = 50,
    ) -> pd.DataFrame:

        if not self._loaded:
            self.load()

        city_lower = city.lower().strip()
        pref       = preference_text.lower()

        query_vec = self._encode_user_preference(preference_text, city)

        distances, indices = search_index(self.index, query_vec, top_k=top_k * 2)

        candidate_indices = indices[0]
        candidate_scores  = distances[0]

        valid_mask        = candidate_indices < len(self.attractions_df)
        candidate_indices = candidate_indices[valid_mask]
        candidate_scores  = candidate_scores[valid_mask]

        candidates                    = self.attractions_df.iloc[candidate_indices].copy()
        candidates["semantic_score"]  = candidate_scores

        candidates = candidates[
            candidates["city_clean"] == city_lower
        ].copy()

        print(f"City filter → {len(candidates)} results for '{city}'")

        if len(candidates) == 0:
            return pd.DataFrame()

        original_candidates = candidates.copy()

        if any(w in pref for w in ["temple", "spiritual", "religious", "church", "mosque"]):
            candidates = candidates[
                candidates["category"].str.contains(
                    "temple|church|mosque", case=False, na=False
                )
            ]
        elif any(w in pref for w in ["mall", "shopping", "market"]):
            candidates = candidates[
                candidates["category"].str.contains(
                    "mall|market|shopping", case=False, na=False
                )
            ]
        elif any(w in pref for w in ["nature", "park", "waterfall"]):
            candidates = candidates[
                candidates["category"].str.contains(
                    "park|garden|nature|waterfall", case=False, na=False
                )
            ]
        elif any(w in pref for w in ["beach", "sea", "coast"]):
            candidates = candidates[
                candidates["category"].str.contains(
                    "beach|coast", case=False, na=False
                )
            ]

        if len(candidates) < 3:
            print("⚠ Too few intent-matched results → fallback to general")
            candidates = original_candidates

        max_fee = budget_per_day_inr * ATTRACTION_BUDGET_FRACTION

        if "entrance_fee" in candidates.columns:
            filtered = candidates[candidates["entrance_fee"].fillna(0) <= max_fee]
            if len(filtered) < duration_days * 2:
                filtered = candidates
        else:
            filtered = candidates

        filtered  = filtered.copy()
        sem_norm  = filtered["semantic_score"] / (filtered["semantic_score"].max() + 1e-9)
        pop       = filtered.get("popularity_score", pd.Series([50] * len(filtered), index=filtered.index))
        pop_norm  = pop / (pop.max() + 1e-9)

        if "entrance_fee" in filtered.columns:
            fee        = filtered["entrance_fee"].fillna(0)
            budget_fit = 1 - (fee / (max_fee + 1e-9))
        else:
            budget_fit = 1

        filtered["final_score"] = (
            0.65 * sem_norm +
            0.25 * pop_norm +
            0.10 * budget_fit
        )

        n_return = duration_days * 5 + 5
        result = (
            filtered
            .sort_values("final_score", ascending=False)
            .head(n_return)
            .reset_index(drop=True)
        )

        print(f"Returning {len(result)} results for {city}")
        return result

    # ── NEW method — dynamic FAISS built from Geoapify DataFrame ──────────

    def recommend_from_dataframe(
        self,
        df: pd.DataFrame,
        preference_text: str,
        city: str,
        budget_per_day_inr: float,
        duration_days: int = 3,
        top_k: int = 30,
    ) -> pd.DataFrame:
        """
        Build a per-request FAISS index from any DataFrame (e.g. Geoapify
        results) and rank rows by SBERT similarity to preference_text.

        The returned DataFrame has exactly the same columns as recommend()
        returns, so ml_service, the ranker, and the scheduler receive an
        identical structure regardless of which path was used.

        Args:
            df             : DataFrame from geo_service.get_places() with
                             attraction_name, category, city, etc.
            preference_text: User's typed preference sentence.
            city           : Requested city (used for encoding context).
            budget_per_day_inr: Daily budget for entrance-fee filtering.
            duration_days  : Used to size the returned pool.
            top_k          : Number of FAISS nearest neighbours to retrieve.

        Returns:
            Filtered, scored DataFrame ready for XGBRanker.rerank().
        """ 
        if not self._model_loaded:
            self.load_model()

        if df.empty:
            return pd.DataFrame()

        df = df.copy().reset_index(drop=True)

        # ── 1: Build text representations for each place ──────────────────
        # Combine the columns the scheduler will show so SBERT can pick up
        # meaningful signals from names and categories.
        def _row_text(row: pd.Series) -> str:
            parts = [
                str(row.get("attraction_name", "")),
                str(row.get("category", "")),
                str(row.get("city", "")),
                str(row.get("interest_tags_str", "")),
            ]
            return " ".join(p for p in parts if p and p.lower() != "nan")

        place_texts: list[str] = df.apply(_row_text, axis=1).tolist()

        # ── 2: Encode all places with SBERT ───────────────────────────────
        print(f"  [DynamicFAISS] Encoding {len(place_texts)} places with SBERT...")
        place_embeddings: np.ndarray = self.model.encode(
            place_texts,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
            batch_size=64,
        ).astype(np.float32)

        # ── 3: Build a flat inner-product index (cosine sim on L2-normed vecs)
        dim   = place_embeddings.shape[1]
        index = faiss.IndexFlatIP(dim)
        index.add(place_embeddings)

        # ── 4: Encode user preference ─────────────────────────────────────
        query_vec = self._encode_user_preference(preference_text, city)
        # query_vec is already L2-normalized by _encode_user_preference

        # ── 5: Search ─────────────────────────────────────────────────────
        # Cap top_k to available places — FAISS raises an error otherwise
        k = min(top_k, len(df))
        scores, indices = index.search(query_vec.reshape(1, -1), k)

        hit_indices: np.ndarray = indices[0]
        hit_scores:  np.ndarray = scores[0]

        # ── 6: Collect results ────────────────────────────────────────────
        candidates = df.iloc[hit_indices].copy()
        candidates["semantic_score"] = hit_scores

        if candidates.empty:
            return pd.DataFrame()

        # ── 7: Budget filter with relaxation ─────────────────────────────
        max_fee = budget_per_day_inr * ATTRACTION_BUDGET_FRACTION

        if "entrance_fee" in candidates.columns:
            filtered = candidates[candidates["entrance_fee"].fillna(0) <= max_fee]
            if len(filtered) < duration_days * 2:
                # Relax to 60 % before giving up
                filtered = candidates[
                    candidates["entrance_fee"].fillna(0) <= budget_per_day_inr * 0.60
                ]
            if len(filtered) < 2:
                filtered = candidates
        else:
            filtered = candidates

        # ── 8: Score ──────────────────────────────────────────────────────
        filtered = filtered.copy()

        sem_max  = filtered["semantic_score"].max()
        sem_norm = filtered["semantic_score"] / (sem_max + 1e-9)

        pop     = filtered.get(
            "popularity_score",
            pd.Series([50.0] * len(filtered), index=filtered.index)
        )
        pop_norm = pop / (pop.max() + 1e-9)

        if "entrance_fee" in filtered.columns:
            fee        = filtered["entrance_fee"].fillna(0)
            budget_fit = 1.0 - (fee / (max_fee + 1e-9)).clip(0, 1)
        else:
            budget_fit = 1.0

        filtered["budget_fit_score"] = budget_fit
        filtered["final_score"] = (
            0.65 * sem_norm
            + 0.25 * pop_norm
            + 0.10 * budget_fit
        )

        # ── 9: Deduplicate and return ─────────────────────────────────────
        filtered = filtered.drop_duplicates(
            subset=["attraction_name"], keep="first"
        )

        n_return = duration_days * 5 + 5
        result = (
            filtered
            .sort_values("final_score", ascending=False)
            .head(n_return)
            .reset_index(drop=True)
        )

        print(
            f"  [DynamicFAISS] Returning {len(result)} results "
            f"for '{city}' (query: '{preference_text[:50]}')"
        )
        return result