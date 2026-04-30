# backend/services/ml_service.py

import os
import pandas as pd
from typing import Optional

from ml.recommender.semantic_search import AttractionRecommender
from ml.ranking.train_ranker import AttractionRanker
from ml.scheduler.day_scheduler import DayScheduler

# Set USE_GEOAPIFY=true in .env to use live Geoapify data.
# Set USE_GEOAPIFY=false to fall back to the original SBERT+FAISS CSV path.
USE_GEOAPIFY: bool = os.getenv("USE_GEOAPIFY", "true").lower() == "true"


class MLService:

    def __init__(self):
        self.recommender = AttractionRecommender()
        self.ranker      = AttractionRanker()
        self.scheduler   = DayScheduler(attractions_per_day=4)
        self.restaurants_df: Optional[pd.DataFrame] = None

    async def load_all(self):
        print("  Loading SBERT + FAISS recommender...")
        self.recommender.load()

        print("  Loading XGBRanker...")
        self.ranker.load()

        print("  Loading restaurants data...")
        rest_path = "data/processed/restaurants_featured.csv"
        if os.path.exists(rest_path):
            self.restaurants_df = pd.read_csv(rest_path)
            print(f"  Loaded {len(self.restaurants_df)} restaurants")
        else:
            print("  Warning: restaurants_featured.csv not found")
            self.restaurants_df = None

    # ── Private: Geoapify → SBERT → dynamic FAISS path ────────────────────

    def _candidates_from_geoapify(
        self,
        city: str,
        preference_text: str,
        effective_budget: float,
        duration_days: int,
    ) -> pd.DataFrame:
        """
        1. Fetch places from Geoapify.
        2. Pass them through semantic_search.recommend_from_dataframe()
           which builds a per-request FAISS index and re-ranks by SBERT
           similarity to the user's preference_text.
        3. Return a DataFrame whose columns exactly match what the
           scheduler's _row_to_dict() reads.
        """
        from backend.services.geo_service import get_places

        places = get_places(city=city, user_input=preference_text)

        if not places:
            return pd.DataFrame()

        raw_df = pd.DataFrame(places)

        # Pass through the dynamic SBERT+FAISS recommender
        candidates = self.recommender.recommend_from_dataframe(
            df=raw_df,
            preference_text=preference_text,
            city=city,
            budget_per_day_inr=effective_budget,
            duration_days=duration_days,
        )

        return candidates

    # ── Private: original static CSV+FAISS path ────────────────────────────

    def _candidates_from_csv(
        self,
        city: str,
        preference_text: str,
        effective_budget: float,
        duration_days: int,
    ) -> pd.DataFrame:
        top_k = max(60, duration_days * 10)
        return self.recommender.recommend(
            city=city,
            preference_text=preference_text,
            budget_per_day_inr=effective_budget,
            duration_days=duration_days,
            top_k=top_k,
        )

    # ── Public entry point ─────────────────────────────────────────────────

    def generate_itinerary(
        self,
        city: str,
        duration_days: int,
        budget_per_day_inr: float,
        preference_text: str,
        max_total_budget_inr: Optional[float] = None,
    ) -> list[dict]:

        # ── Step 0: Effective daily budget ────────────────────────────────
        if max_total_budget_inr is not None:
            cap_per_day      = max_total_budget_inr / duration_days
            effective_budget = min(budget_per_day_inr, cap_per_day)
        else:
            effective_budget = budget_per_day_inr

        source = "geoapify+dynamic_faiss" if USE_GEOAPIFY else "csv+static_faiss"
        print(f"\n[MLService] city={city} | days={duration_days} | "
              f"₹{effective_budget:.0f}/day | source={source}")

        # ── Step 1: Obtain candidates ──────────────────────────────────────
        if USE_GEOAPIFY:
            candidates = self._candidates_from_geoapify(
                city, preference_text, effective_budget, duration_days
            )
        else:
            candidates = self._candidates_from_csv(
                city, preference_text, effective_budget, duration_days
            )

        if candidates.empty:
            raise ValueError(f"No attractions found for '{city}'.")

        # ── Step 2: Defensive city filter + dedup (both paths) ────────────
        city_lower = city.lower().strip()
        candidates = candidates[
            candidates["city"].astype(str).str.lower().str.strip() == city_lower
        ].copy()
        candidates = candidates.drop_duplicates(
            subset=["attraction_name"], keep="first"
        ).copy()

        print(f"[MLService] After city filter + dedup: {len(candidates)}")

        if candidates.empty:
            raise ValueError(f"No valid attractions found in '{city}'.")

        # ── Step 3: XGBoost ranking ────────────────────────────────────────
        ranked = self.ranker.rerank(candidates)

        # ── Step 4: Relaxed budget filter ─────────────────────────────────
        # Use 60 % ceiling here (not 25 %) so the scheduler pool is not
        # starved. The scheduler applies its own internal 70 % cap.
        if "entrance_fee" in ranked.columns:
            affordable = ranked[
                ranked["entrance_fee"].fillna(0) <= effective_budget * 0.60
            ]
            if len(affordable) >= duration_days * 2:
                ranked = affordable.copy()

        print(f"[MLService] Passing {len(ranked)} candidates to scheduler")

        # ── Step 5: Schedule ───────────────────────────────────────────────
        itinerary = self.scheduler.build_itinerary(
            city=city,
            duration_days=duration_days,
            attractions=ranked,
            restaurants=self.restaurants_df,
            budget_per_day_inr=effective_budget,
            preference_text=preference_text,
        )

        if not itinerary:
            raise ValueError(
                f"Scheduler produced no days for '{city}'. "
                "The attraction pool may be too small for the requested duration."
            )

        return itinerary