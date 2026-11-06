import pandas as pd
import numpy as np
import os
from typing import Optional

from ml.embeddings.faiss_index import load_index, search_index

MODELS_DIR = "data/models"
PROCESSED_DIR = "data/processed"


class RestaurantRecommender:
    """Recommend restaurants based on cuisine preferences and budget."""

    def __init__(self):
        self.index = None
        self.restaurants_df = None
        self._loaded = False

    def load(self):
        if self._loaded:
            return
        try:
            self.index = load_index("restaurant_index")
        except FileNotFoundError:
            print("  Restaurant FAISS index not found, using fallback")
            self.index = None

        rest_path = os.path.join(PROCESSED_DIR, "restaurants_featured.csv")
        if os.path.exists(rest_path):
            self.restaurants_df = pd.read_csv(rest_path)
        self._loaded = True

    def recommend(
        self,
        city: str,
        budget: str = "mid",
        cuisine_preference: Optional[str] = None,
        top_k: int = 10,
    ) -> pd.DataFrame:
        """Get restaurant recommendations for a city."""
        if not self._loaded:
            self.load()

        df = self.restaurants_df
        if df is None:
            return pd.DataFrame()

        # City filter
        city_df = df[df["city"].str.lower().str.contains(city.lower(), na=False)]
        if len(city_df) == 0:
            city_df = df

        # Budget filter
        budget_max = {"budget": 300, "mid": 800, "premium": 9999}.get(budget, 800)
        if "cost_for_two" in city_df.columns:
            city_df = city_df[city_df["cost_for_two"].fillna(500) <= budget_max]

        # Cuisine filter
        if cuisine_preference and "cuisine" in city_df.columns:
            cuisine_match = city_df[
                city_df["cuisine"].str.lower().str.contains(cuisine_preference.lower(), na=False)
            ]
            if len(cuisine_match) >= 3:
                city_df = cuisine_match

        # Sort by rating
        if "rating" in city_df.columns:
            city_df = city_df.sort_values("rating", ascending=False)

        return city_df.head(top_k).reset_index(drop=True)