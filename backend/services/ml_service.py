# backend/services/ml_service.py

import os
import pandas as pd
from typing import Optional
from backend.core.config import settings
from ml.recommender.semantic_search import AttractionRecommender
from ml.ranking.train_ranker import AttractionRanker
from ml.optimizer.route_optimizer import haversine_distance, solve_tsp
from ml.scheduler.day_scheduler import DayScheduler, _coord, _route_distance_km

# Assumed meal cost for two when a restaurant has no price data.
# Such meals are flagged cost_is_estimate so the UI can say so.
ESTIMATED_MEAL_COST_FOR_TWO = 800.0
ESTIMATED_BREAKFAST_COST_FOR_TWO = 300.0
HOTEL_SEARCH_DEGREES = 0.03   # about 3 km around the centre of the trip
LUNCH_BUDGET_FRACTION = 0.40

# Set USE_GEOAPIFY=true in .env to use live Geoapify data.
# Set USE_GEOAPIFY=false to fall back to the original SBERT+FAISS CSV path.
#USE_GEOAPIFY: bool = os.getenv("USE_GEOAPIFY", "true").lower() == "true"


class MLService:

    def __init__(self):
        self.recommender = AttractionRecommender()
        self.ranker      = AttractionRanker()
        self.scheduler   = DayScheduler(attractions_per_day=4)
        self.restaurants_df: Optional[pd.DataFrame] = None

    async def load_all(self):
        if settings.USE_GEOAPIFY:
            print("  Loading Sentence-BERT for Geoapify dynamic FAISS...")
            self.recommender.load_model()
        else:
                print("  Loading SBERT + static FAISS recommender...")
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

 
    def _candidates_from_geoapify(
        self,
        city: str,
        preference_text: str,
        effective_budget: float,
        duration_days: int,
        exclude_places: Optional[list[str]] = None,
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

        raw_df = self._drop_excluded(
            pd.DataFrame(places), exclude_places, duration_days * 2
        )

        # Pass through the dynamic SBERT+FAISS recommender
        candidates = self.recommender.recommend_from_dataframe(
            df=raw_df,
            preference_text=preference_text,
            city=city,
            budget_per_day_inr=effective_budget,
            duration_days=duration_days,
        )

        return candidates

    # ── Private: restaurants ───────────────────────────────────────────────

    def _restaurants_for_city(
        self, city: str, effective_budget: float
    ) -> Optional[pd.DataFrame]:
        """CSV restaurants when the city has any, else live Geoapify ones."""
        csv = self.restaurants_df
        if csv is not None and "city" in csv.columns:
            cities = csv["city"].astype(str).str.lower().str.strip()
            if (cities == city.lower().strip()).any():
                return csv

        if not settings.USE_GEOAPIFY:
            return csv

        from backend.services.geo_service import get_restaurants

        try:
            rows = get_restaurants(city)
        except Exception as exc:  # Meals are optional; never fail the trip.
            print(f"  [MLService] Restaurant lookup failed: {exc}")
            return csv

        if not rows:
            return csv

        df = pd.DataFrame(rows)
        df["rating"] = float("nan")
        df["cost_for_two"] = min(
            ESTIMATED_MEAL_COST_FOR_TWO, effective_budget * LUNCH_BUDGET_FRACTION
        )
        df["cost_is_estimate"] = True
        return df

    def _add_stays(
        self,
        itinerary: list[dict],
        city: str,
        restaurants: Optional[pd.DataFrame],
    ) -> None:
        """
        Adds a hotel central to the trip and a breakfast near it to each day.
        Both are extras: if either lookup fails the itinerary stays valid.
        """
        if not settings.USE_GEOAPIFY:
            return

        from backend.services.geo_service import get_hotels

        points = [
            (float(a["latitude"]), float(a["longitude"]))
            for day in itinerary
            for a in day["attractions"]
            if a.get("latitude") is not None and pd.notna(a.get("latitude"))
            and a.get("longitude") is not None and pd.notna(a.get("longitude"))
        ]
        if not points:
            return

        lat = sum(p[0] for p in points) / len(points)
        lon = sum(p[1] for p in points) / len(points)
        nearest = lambda r: (r["latitude"] - lat) ** 2 + (r["longitude"] - lon) ** 2

        try:
            hotels = get_hotels(city)
        except Exception as exc:
            print(f"  [MLService] Hotel lookup failed: {exc}")
            hotels = []

        # Few hotels have a real star rating, so use them when they are close.
        rated = [
            h for h in hotels
            if h.get("stars") and nearest(h) <= HOTEL_SEARCH_DEGREES ** 2
        ]
        if rated:
            hotel = max(rated, key=lambda h: (h["stars"], -nearest(h)))
        else:
            hotel = min(hotels, key=nearest) if hotels else None

        if hotel:
            for day in itinerary:
                self._order_from_hotel(day, hotel)

        # Only live restaurants are known to have coordinates and estimates.
        pool: list[dict] = []
        if restaurants is not None and "cost_is_estimate" in restaurants.columns:
            pool = restaurants.to_dict("records")

        used: set[str] = set()

        def closest_meal(point: tuple[float, float]) -> Optional[dict]:
            free = [r for r in pool if str(r["restaurant_name"]).lower() not in used]
            if not free:
                return None
            meal = min(
                free,
                key=lambda r: (r["latitude"] - point[0]) ** 2
                + (r["longitude"] - point[1]) ** 2,
            )
            used.add(str(meal["restaurant_name"]).lower())
            return meal

        for day in itinerary:
            day["hotel"] = hotel
            if not pool:
                continue

            # Stops may have moved, so choose meals that suit the new order.
            stops = [c for c in map(_coord, day["attractions"]) if c]
            if stops:
                day["lunch"] = closest_meal(stops[(len(stops) - 1) // 2]) or day["lunch"]
                day["dinner"] = closest_meal(stops[-1]) or day["dinner"]

            start = _coord(hotel) if hotel else (stops[0] if stops else None)
            found = closest_meal(start) if start else None
            if not found:
                continue
            breakfast = dict(found)
            breakfast["cost_for_two"] = min(
                ESTIMATED_BREAKFAST_COST_FOR_TWO, float(breakfast["cost_for_two"])
            )
            day["breakfast"] = breakfast
            day["day_budget_actual"] = round(
                day["day_budget_actual"] + breakfast["cost_for_two"] / 2, 2
            )
            limit = day["day_budget_limit"]
            day["budget_utilization_pct"] = (
                round(day["day_budget_actual"] / limit * 100, 1) if limit > 0 else 0
            )

    def _order_from_hotel(self, day: dict, hotel: dict) -> None:
        """
        Re-solves the day as a round trip from the hotel, nearest stop first.
        Flexible leisure days have no timed stops and are left as they are.
        """
        stops = [a for a in day["attractions"] if _coord(a) and a.get("start_time")]
        if len(stops) < 2 or len(stops) != len(day["attractions"]):
            return

        start = _coord(hotel)
        locations = [start] + [_coord(a) for a in stops]
        tour = solve_tsp(
            locations,
            ["Hotel"] + [a["name"] for a in stops],
            time_limit_seconds=1,
        )
        ordered = [stops[i - 1] for i in tour if i != 0]

        # A round trip can run either way: begin with the closer end.
        if haversine_distance(start, _coord(ordered[-1])) < haversine_distance(
            start, _coord(ordered[0])
        ):
            ordered.reverse()

        day["attractions"] = self.scheduler._assign_time_slots(ordered)
        day["total_distance_km"] = _route_distance_km(day["attractions"])

    @staticmethod
    def _drop_excluded(
        df: pd.DataFrame, exclude_places: Optional[list[str]], min_keep: int
    ) -> pd.DataFrame:
        """Remove excluded names, unless too few places would remain."""
        if not exclude_places or df.empty:
            return df
        excluded = {name.lower().strip() for name in exclude_places}
        names = df["attraction_name"].astype(str).str.lower().str.strip()
        kept = df[~names.isin(excluded)]
        return kept if len(kept) >= min_keep else df

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
        exclude_places: Optional[list[str]] = None,
    ) -> list[dict]:

        # ── Step 0: Effective daily budget ────────────────────────────────
        if max_total_budget_inr is not None:
            cap_per_day      = max_total_budget_inr / duration_days
            effective_budget = min(budget_per_day_inr, cap_per_day)
        else:
            effective_budget = budget_per_day_inr

        source = (
    "geoapify+dynamic_faiss"
    if settings.USE_GEOAPIFY
    else "csv+static_faiss"
)
        print(f"\n[MLService] city={city} | days={duration_days} | "
              f"₹{effective_budget:.0f}/day | source={source}")

        # ── Step 1: Obtain candidates ──────────────────────────────────────
        if settings.USE_GEOAPIFY:
            candidates = self._candidates_from_geoapify(
                city, preference_text, effective_budget, duration_days,
                exclude_places,
            )
        else:
            candidates = self._drop_excluded(
                self._candidates_from_csv(
                    city, preference_text, effective_budget, duration_days
                ),
                exclude_places,
                duration_days * 2,
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
        restaurants = self._restaurants_for_city(city, effective_budget)

        itinerary = self.scheduler.build_itinerary(
            city=city,
            duration_days=duration_days,
            attractions=ranked,
            restaurants=restaurants,
            budget_per_day_inr=effective_budget,
            preference_text=preference_text,
        )

        if not itinerary:
            raise ValueError(
                f"Scheduler produced no days for '{city}'. "
                "The attraction pool may be too small for the requested duration."
            )

        self._add_stays(itinerary, city, restaurants)

        return itinerary
