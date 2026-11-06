# backend/services/geo_service.py
"""
Fetches real-world attraction data from Geoapify Places API.

Returns dicts with EXACT keys expected by the scheduler:
  attraction_name, category, city, latitude, longitude,
  rating, entrance_fee, visit_duration_hours
"""

import os
import math
import httpx
from typing import Optional
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
from backend.core.config import settings

GEOAPIFY_API_KEY = settings.GEOAPIFY_API_KEY or ""

ATTRACTION_CATEGORIES = [
    "tourism.sights",
    "tourism.attraction",
    "entertainment.museum",
    "entertainment.culture",
    "natural",
    "religion",
    "heritage",
    "leisure.park",
]

MAX_RADIUS_KM  = 40.0
SEARCH_RADIUS_M = 40_000
MAX_PLACES     = 100

# Maps Geoapify category strings → scheduler-friendly labels
_CATEGORY_MAP = {
    "tourism.sights":        "Historical",
    "tourism.attraction":    "Attraction",
    "entertainment.museum":  "Museum",
    "entertainment.culture": "Cultural",
    "natural":               "Nature",
    "religion":              "Spiritual",
    "heritage":              "Heritage",
    "leisure.park":          "Park",
}

# Approximate visit duration in hours by category
_DURATION_MAP = {
    "Museum":     2.5,
    "Heritage":   2.0,
    "Historical": 2.0,
    "Nature":     3.0,
    "Park":       2.0,
    "Cultural":   1.5,
    "Spiritual":  1.0,
    "Attraction": 1.5,
}


# ── Helpers ────────────────────────────────────────────────────────────────

def _is_valid_coord(lat: object, lon: object) -> bool:
    try:
        la, lo = float(lat), float(lon)   # type: ignore[arg-type]
    except (TypeError, ValueError):
        return False
    return (
        math.isfinite(la) and math.isfinite(lo)
        and la != 0.0 and lo != 0.0
        and -90 <= la <= 90
        and -180 <= lo <= 180
    )


def _geocode_city(city: str) -> Optional[tuple[float, float]]:
    try:
        geo      = Nominatim(user_agent="itinera_geo", timeout=5)
        location = geo.geocode(f"{city}, India")
        if location:
            return float(location.latitude), float(location.longitude)
    except Exception as exc:
        print(f"  [GeoService] Geocoding failed for '{city}': {exc}")
    return None

def _map_category(raw_cats: list[str]) -> str:
    for cat in raw_cats:
        for key, label in _CATEGORY_MAP.items():
            if cat == key or cat.startswith(key + "."):
                return label

    return "Attraction"


# ── Geoapify fetch ─────────────────────────────────────────────────────────
def _fetch_raw(city_lat: float, city_lon: float, limit: int) -> list[dict]:
    url = "https://api.geoapify.com/v2/places"

    params = {
        "categories": ",".join(ATTRACTION_CATEGORIES),
        "filter": f"circle:{city_lon},{city_lat},{SEARCH_RADIUS_M}",
        "bias": f"proximity:{city_lon},{city_lat}",
        "limit": limit,
        "apiKey": GEOAPIFY_API_KEY,
    }

    try:
        with httpx.Client(timeout=20) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            return resp.json().get("features", [])

    except httpx.HTTPStatusError as exc:
        print(f"  [GeoService] HTTP {exc.response.status_code} from Geoapify")
    except httpx.RequestError as exc:
        print(f"  [GeoService] Request error: {exc}")
    except Exception as exc:
        print(f"  [GeoService] Unexpected error: {exc}")

    return []

def _parse(
    feature: dict,
    city_lat: float,
    city_lon: float,
    city_name: str,
) -> Optional[dict]:
    props = feature.get("properties", {})
    geom  = feature.get("geometry",   {})

    coords = geom.get("coordinates", [])
    if not coords or len(coords) < 2:
        return None

    lon, lat = coords[0], coords[1]    # GeoJSON is [lon, lat]

    if not _is_valid_coord(lat, lon):
        return None

    # Re-validate distance even though Geoapify was given a circle filter
    if geodesic((lat, lon), (city_lat, city_lon)).km > MAX_RADIUS_KM:
        return None

    name = (
        props.get("name")
        or props.get("address_line1")
        or props.get("formatted", "").split(",")[0]
    ).strip()

    if not name or len(name) < 3:
        return None

    category      = _map_category(props.get("categories", []))
    visit_duration = _DURATION_MAP.get(category, 2.0)

    # Geoapify has no rating field; default to 4.0 so XGBoost features
    # are never NaN and the scheduler always gets a usable value.
    return {
        # ── EXACT keys the scheduler expects ──────────────────────────────
        "attraction_name":      name,
        "category":             category,
        "city":                 city_name,
        "latitude":             float(lat),
        "longitude":            float(lon),
        "rating":               4.0,
        "entrance_fee":         0.0,
        "visit_duration_hours": visit_duration,
        # ── Extra columns consumed by XGBoost extract_features() ──────────
        "popularity_score":     50.0,
        "budget_tier":          "mid",
        "recommended_time_slot":"morning",
        "interest_tags_str":    category.lower(),
        "final_score":          0.5,
        "semantic_score":       0.5,
        "budget_fit_score":     1.0,
    }


# ── Public API ─────────────────────────────────────────────────────────────

def get_places(city: str, user_input: str = "") -> list[dict]:
    """
    Return a list of validated attraction dicts for the requested city.
    All dicts contain the exact keys the scheduler's _row_to_dict() reads.
    """
    if not GEOAPIFY_API_KEY:
        raise EnvironmentError(
            "GEOAPIFY_API_KEY is not set. Add it to your .env file."
        )

    centre = _geocode_city(city)
    if centre is None:
        print(f"  [GeoService] Cannot geocode '{city}'")
        return []

    city_lat, city_lon = centre
    print(f"  [GeoService] '{city}' centre: {city_lat:.4f}, {city_lon:.4f}")

    raw = _fetch_raw(city_lat, city_lon, limit=MAX_PLACES)
    print(f"  [GeoService] Raw features: {len(raw)}")

    places: list[dict] = []
    seen:   set[str]   = set()

    for feature in raw:
        parsed = _parse(feature, city_lat, city_lon, city)
        if parsed is None:
            continue
        key = parsed["attraction_name"].lower().strip()
        if key in seen:
            continue
        seen.add(key)
        places.append(parsed)

    print(f"  [GeoService] Valid unique places: {len(places)}")
    return places