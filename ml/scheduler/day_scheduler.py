import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional
import math

from ml.optimizer.route_optimizer import optimize_day_route, haversine_distance

LUNCH_TIME = "12:30"
DINNER_TIME = "19:30"

ATTRACTION_FRACTION = 0.25
LUNCH_FRACTION = 0.40
DINNER_FRACTION = 0.50
TRANSPORT_FRACTION = 0.15

FOOD_CATEGORIES = {
    "cafe", "coffee", "bakery", "restaurant", "food", "bistro",
    "patisserie", "tea house", "bar", "pub", "eatery", "diner",
}

LEISURE_DAY = "__LEISURE__"


def _is_food_venue(attraction: dict) -> bool:
    category = str(attraction.get("category", "")).lower().strip()
    name = str(attraction.get("name", "")).lower().strip()
    return any(f in category for f in FOOD_CATEGORIES) or any(
        f in name for f in {"cafe", "coffee", "bistro", "bakery"}
    )


def _coord(stop: dict) -> Optional[tuple[float, float]]:
    """A stop's (lat, lon), or None when it has no usable coordinates."""
    lat, lon = stop.get("latitude"), stop.get("longitude")
    if lat is None or lon is None or pd.isna(lat) or pd.isna(lon):
        return None
    return float(lat), float(lon)


def _route_distance_km(day_attractions: list[dict]) -> float:
    """Straight-line km along the day's stops, in visiting order."""
    points = [c for c in map(_coord, day_attractions) if c]
    return round(
        sum(haversine_distance(a, b) for a, b in zip(points, points[1:])), 2
    )


class DayScheduler:

    def __init__(self, attractions_per_day: int = 4):
        self.attractions_per_day = attractions_per_day

    def _time_add(self, base_time: str, hours: float) -> str:
        base = datetime.strptime(base_time, "%H:%M")
        result = base + timedelta(hours=hours)
        return result.strftime("%H:%M")

    def _assign_time_slots(self, day_attractions: list[dict]) -> list[dict]:
        schedule = []
        current_time = "09:00"
        lunch_inserted = False

        for attraction in day_attractions:
            if not lunch_inserted and current_time >= "12:00":
                current_time = "13:30"
                lunch_inserted = True

            attraction = attraction.copy()
            attraction["start_time"] = current_time

            duration = float(attraction.get("visit_duration_hours", 2.0))
            attraction["end_time"] = self._time_add(current_time, duration)

            schedule.append(attraction)
            current_time = self._time_add(current_time, duration + 0.5)

        return schedule

    def _select_restaurant(
        self,
        restaurants: pd.DataFrame,
        city: str,
        max_cost_for_two: float,
        meal_type: str,
        day_offset: int,
        exclude_names=None,
        near: Optional[tuple[float, float]] = None,
    ) -> Optional[dict]:

        if restaurants is None or len(restaurants) == 0:
            return None

        if "city" in restaurants.columns:
            city_df = restaurants[
                restaurants["city"].str.lower().str.strip() == city.lower().strip()
            ]
        else:
            city_df = restaurants

        if len(city_df) == 0:
            return None

        if "cost_for_two" in city_df.columns:
            city_df = city_df[
                city_df["cost_for_two"].fillna(400) <= max_cost_for_two
            ]

        if "rating" in city_df.columns:
            city_df = city_df.sort_values("rating", ascending=False)

        if exclude_names and len(city_df) > 0:
            city_df = city_df[
                ~city_df.apply(
                    lambda r: str(
                        r.get("name")
                        or r.get("restaurant_name")
                        or r.get("res_name")
                    ).lower() in exclude_names,
                    axis=1
                )
            ]

        records = city_df.to_dict("records")
        if not records:
            return None

        # Live restaurants have no rating to rank by, so prefer the closest.
        if near and "cost_is_estimate" in city_df.columns:
            return min(
                records,
                key=lambda r: (r["latitude"] - near[0]) ** 2
                + (r["longitude"] - near[1]) ** 2,
            )

        index = (day_offset * 3) % len(records)
        return records[index]

    def _compute_day_budget(
        self,
        day_attractions: list[dict],
        lunch: Optional[dict],
        dinner: Optional[dict],
        budget_per_day_inr: float,
    ) -> tuple[float, float]:

        attraction_fees = sum(float(a.get("entrance_fee", 0)) for a in day_attractions)
        lunch_cost = float(lunch.get("cost_for_two", 0)) / 2 if lunch else 0
        dinner_cost = float(dinner.get("cost_for_two", 0)) / 2 if dinner else 0
        transport = budget_per_day_inr * TRANSPORT_FRACTION

        actual = attraction_fees + lunch_cost + dinner_cost + transport
        utilization = (actual / budget_per_day_inr * 100) if budget_per_day_inr > 0 else 0

        return round(actual, 2), round(utilization, 1)

    def _row_to_dict(self, row) -> dict:
        return {
            "name": row.get("attraction_name") or "Unknown Place",
            "category": row.get("category"),
            "city": row.get("city"),
            "visit_duration_hours": row.get("visit_duration_hours", 2),
            "entrance_fee": float(row.get("entrance_fee", 0)),
            "rating": row.get("rating", 4.0),
            "latitude": row.get("latitude"),
            "longitude": row.get("longitude"),
            "interest_tags": str(row.get("interest_tags_str", "")).split("|"),
            "semantic_score": row.get("semantic_score"),
            "placeholder_metrics": bool(row.get("placeholder_metrics", False)),
        }

    def _partition_attractions(
        self,
        all_attractions: list[dict],
        duration_days: int,
        attractions_per_day: int,
    ) -> list:

        pure_attractions = [a for a in all_attractions if not _is_food_venue(a)]
        cafes = [a for a in all_attractions if _is_food_venue(a)]

        total = len(pure_attractions)
        threshold = duration_days * 2

        days = []

        if total >= threshold:
            target = max(2, min(attractions_per_day, math.ceil(total / duration_days), 3))
            pool = list(pure_attractions)

            for _ in range(duration_days):
                chunk = pool[:target]
                pool = pool[target:]
                days.append(chunk if chunk else LEISURE_DAY)

        else:
            mid = max(1, total // 2)
            top_pool = list(pure_attractions[:mid])
            lower_pool = list(pure_attractions[mid:])
            cafe_pool = list(cafes)

            for day_idx in range(duration_days):
                day_list = []

                if day_idx % 2 == 0:
                    day_list = top_pool[:2]
                    top_pool = top_pool[2:]
                else:
                    day_list = lower_pool[:1]
                    lower_pool = lower_pool[1:]

                    if len(day_list) < 2 and cafe_pool:
                        day_list.append(cafe_pool.pop(0))

                if not day_list:
                    days.append(LEISURE_DAY)
                else:
                    days.append(day_list)

        while len(days) < duration_days:
            days.append(LEISURE_DAY)

        return days[:duration_days]

    def build_itinerary(
        self,
        city: str,
        duration_days: int,
        attractions: pd.DataFrame,
        restaurants: Optional[pd.DataFrame],
        budget_per_day_inr: float,
        preference_text: Optional[str] = None,
    ) -> list[dict]:

        attractions = attractions[
            attractions["city"].str.lower().str.strip() == city.lower().strip()
        ].copy()

        max_lunch = budget_per_day_inr * LUNCH_FRACTION
        max_dinner = budget_per_day_inr * DINNER_FRACTION

        all_dicts = [
            self._row_to_dict(row) for _, row in attractions.iterrows()
        ]

        day_buckets = self._partition_attractions(
            all_dicts, duration_days, self.attractions_per_day
        )

        itinerary = []

        # ✅ GLOBAL used set (FIX)
        used_names = set()

        for day_idx, bucket in enumerate(day_buckets):
            day_num = day_idx + 1
            is_leisure = (bucket == LEISURE_DAY)

            if is_leisure:
                day_list = []

                # local attraction (no repeat)
                local_spot = None
                for a in reversed(all_dicts):
                    if a.get("name") and a["name"].lower() not in used_names:
                        local_spot = a
                        break

                if local_spot:
                    used_names.add(local_spot["name"].lower())
                    day_list.append(local_spot)

                cafe = self._select_restaurant(
                    restaurants, city, max_lunch, "lunch", day_idx, used_names
                )

                if cafe:
                    cname = (
                        cafe.get("name")
                        or cafe.get("restaurant_name")
                        or cafe.get("res_name")
                        or "Local Cafe"
                    )
                    used_names.add(cname.lower())

                    day_list.append({
                        "name": cname,
                        "category": "Cafe",
                        "visit_duration_hours": 1.5,
                        "entrance_fee": 0,
                        "rating": cafe.get("rating", 4.0),
                        "latitude": cafe.get("latitude"),
                        "longitude": cafe.get("longitude"),
                        "placeholder_metrics": bool(cafe.get("cost_is_estimate", False)),
                    })

                day_type = "leisure"
                day_title = f"Day {day_num} — {city} (Leisure / Cafe Day)"

            else:
                day_list = optimize_day_route(list(bucket))
                day_list = self._assign_time_slots(day_list)

                day_list = [a for a in day_list if a.get("name")]

                for a in day_list:
                    used_names.add(a["name"].lower())

                has_cafe = any(_is_food_venue(a) for a in day_list)
                day_type = "relaxed" if has_cafe else "tourist"
                day_title = f"Day {day_num} — {city}"

            stops = [c for c in map(_coord, day_list) if c]

            lunch = self._select_restaurant(
                restaurants, city, max_lunch, "lunch", day_idx, used_names,
                near=stops[(len(stops) - 1) // 2] if stops else None,
            )

            if lunch:
                used_names.add(
                    (lunch.get("name") or lunch.get("restaurant_name") or "").lower()
                )

            dinner = self._select_restaurant(
                restaurants, city, max_dinner, "dinner", day_num, used_names,
                near=stops[-1] if stops else None,
            )

            if dinner:
                used_names.add(
                    (dinner.get("name") or dinner.get("restaurant_name") or "").lower()
                )

            actual_cost, utilization = self._compute_day_budget(
                day_list, lunch, dinner, budget_per_day_inr
            )

            itinerary.append({
                "day": day_num,
                "title": day_title,
                "day_type": day_type,
                "attractions": day_list,
                "lunch": lunch,
                "dinner": dinner,
                "day_budget_actual": actual_cost,
                "day_budget_limit": budget_per_day_inr,
                "budget_utilization_pct": utilization,
                "total_distance_km": _route_distance_km(day_list),
            })

        return itinerary