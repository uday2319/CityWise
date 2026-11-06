# backend/services/geo_service.py
"""
Fetches real-world attraction data from Geoapify Places API.

Returns dicts with EXACT keys expected by the scheduler:
  attraction_name, category, city, latitude, longitude,
  rating, entrance_fee, visit_duration_hours
"""

import os
import math
import re
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


# Explore-page interest filters → Geoapify category groups
INTEREST_CATEGORIES = {
    "nature":    ["natural", "leisure.park"],
    "adventure": ["natural.mountain", "natural.protected_area", "natural.forest",
                  "camping", "entertainment.activity_park"],
    "history":   ["tourism.sights", "heritage"],
    "religious": ["religion"],
    "beaches":   ["beach"],
    "culture":   ["entertainment.culture", "entertainment.museum"],
}

# Map features with a name that visitors would not choose to go to,
# including unnamed features labelled with their postal code.
_NOT_AN_ATTRACTION = re.compile(
    r"\bparking\b|\bhostel\b|^local park\b|^colony park$|\b\d{6}\b",
    re.IGNORECASE,
)

# East Asian names on places in India are mislabelled map entries.
_EAST_ASIAN_TEXT = re.compile(r"[぀-ヿ一-鿿가-힯]")

# Two entries closer than this are the same place under different names,
# such as "Hawa Mahal" and "Wind Palace".
SAME_PLACE_KM = 0.15

# Successful geocodes only, so a transient failure is retried next request.
_geocode_cache: dict[str, tuple[float, float]] = {}


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
    cache_key = city.lower().strip()
    if cache_key in _geocode_cache:
        return _geocode_cache[cache_key]
    # "Kyoto, Japan" already names a country; a bare city means India.
    query = city if "," in city else f"{city}, India"
    try:
        geo      = Nominatim(user_agent="itinera_geo", timeout=5)
        location = geo.geocode(query)
        if location:
            centre = (float(location.latitude), float(location.longitude))
            _geocode_cache[cache_key] = centre
            return centre
    except Exception as exc:
        print(f"  [GeoService] Geocoding failed for '{city}': {exc}")

    centre = _geocode_with_geoapify(query)
    if centre:
        _geocode_cache[cache_key] = centre
    return centre


def _geocode_with_geoapify(query: str) -> Optional[tuple[float, float]]:
    """Backup for when Nominatim is unreachable or finds nothing."""
    if not GEOAPIFY_API_KEY:
        return None
    try:
        with httpx.Client(timeout=10) as client:
            response = client.get(
                "https://api.geoapify.com/v1/geocode/search",
                params={"text": query, "type": "city", "limit": 1,
                        "format": "json", "apiKey": GEOAPIFY_API_KEY},
            )
            response.raise_for_status()
            results = response.json().get("results", [])
    except (httpx.HTTPError, ValueError) as exc:
        print(f"  [GeoService] Backup geocoding failed: {type(exc).__name__}")
        return None

    # Unknown names otherwise come back as a loose match at low confidence.
    if results and results[0].get("rank", {}).get("confidence", 0) >= 0.5:
        return float(results[0]["lat"]), float(results[0]["lon"])
    return None

def _is_listed(place: dict, places: list[dict]) -> bool:
    """True when an entry already in the list stands at the same spot."""
    here = (place["latitude"], place["longitude"])
    return any(
        geodesic(here, (other["latitude"], other["longitude"])).km < SAME_PLACE_KM
        for other in places
    )


def _display_name(props: dict) -> str:
    """The English name when the map data has one, else the local name."""
    return (props.get("name_international") or {}).get("en") or props.get("name") or ""


def _map_category(raw_cats: list[str]) -> str:
    for cat in raw_cats:
        for key, label in _CATEGORY_MAP.items():
            if cat == key or cat.startswith(key + "."):
                return label

    return "Attraction"


# ── Geoapify fetch ─────────────────────────────────────────────────────────
def _fetch_raw(
    city_lat: float,
    city_lon: float,
    limit: int,
    categories: Optional[list[str]] = None,
) -> list[dict]:
    url = "https://api.geoapify.com/v2/places"

    params = {
        "categories": ",".join(categories or ATTRACTION_CATEGORIES),
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
        _display_name(props)
        or props.get("address_line1")
        or props.get("formatted", "").split(",")[0]
    ).strip()

    if not name or len(name) < 3:
        return None

    if _NOT_AN_ATTRACTION.search(name):
        return None

    if "," not in city_name and _EAST_ASIAN_TEXT.search(name):
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
        # rating and entrance_fee above are defaults, not real data.
        "placeholder_metrics":  True,
        "opening_hours":        props.get("opening_hours"),
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
        if key in seen or _is_listed(parsed, places):
            continue
        seen.add(key)
        places.append(parsed)

    print(f"  [GeoService] Valid unique places: {len(places)}")
    return places


def search_places(city: str, interest: Optional[str] = None, limit: int = 60) -> list[dict]:
    """
    Places for the Explore page. Unlike get_places() this keeps display
    fields and reports rating as None, because Geoapify has no ratings.
    """
    if not GEOAPIFY_API_KEY:
        raise EnvironmentError("GEOAPIFY_API_KEY is not set.")

    centre = _geocode_city(city)
    if centre is None:
        return []
    city_lat, city_lon = centre

    categories = INTEREST_CATEGORIES.get(interest or "")
    # Fetch the full page: names are de-duplicated below, then limited.
    raw = _fetch_raw(city_lat, city_lon, limit=MAX_PLACES, categories=categories)

    places: list[dict] = []
    seen: set[str] = set()
    for feature in raw:
        parsed = _parse(feature, city_lat, city_lon, city)
        if parsed is None:
            continue
        key = parsed["attraction_name"].lower().strip()
        if key in seen:
            continue
        seen.add(key)

        props = feature.get("properties", {})
        places.append({
            "id":          props.get("place_id") or key,
            "name":        parsed["attraction_name"],
            "category":    parsed["category"],
            "city":        city,
            "latitude":    parsed["latitude"],
            "longitude":   parsed["longitude"],
            "address":     props.get("formatted"),
            "website":     props.get("website"),
            "opening_hours": props.get("opening_hours"),
            "visit_duration_hours": parsed["visit_duration_hours"],
            "rating":      None,
        })
    return places[:limit]


def get_hotels(city: str, limit: int = 60) -> list[dict]:
    """Real hotels near the city centre. Geoapify has no prices or ratings."""
    if not GEOAPIFY_API_KEY:
        raise EnvironmentError("GEOAPIFY_API_KEY is not set.")

    centre = _geocode_city(city)
    if centre is None:
        return []
    city_lat, city_lon = centre

    raw = _fetch_raw(city_lat, city_lon, limit=limit, categories=["accommodation.hotel"])

    hotels: list[dict] = []
    for feature in raw:
        props = feature.get("properties", {})
        coords = feature.get("geometry", {}).get("coordinates", [])
        name = _display_name(props).strip()
        if len(name) < 3 or len(coords) < 2 or not _is_valid_coord(coords[1], coords[0]):
            continue
        hotels.append({
            "name":      name,
            "area":      props.get("suburb") or props.get("district"),
            "address":   props.get("formatted"),
            "stars":     (props.get("accommodation") or {}).get("stars"),
            "website":   props.get("website"),
            "latitude":  float(coords[1]),
            "longitude": float(coords[0]),
        })
    print(f"  [GeoService] Hotels for '{city}': {len(hotels)}")
    return hotels


def get_restaurants(city: str, limit: int = 100) -> list[dict]:
    """
    Real restaurants near the city centre, used when the CSV has none.
    Geoapify has no price or rating data, so cost_for_two and rating are
    deliberately absent; the caller decides how to treat them.
    """
    if not GEOAPIFY_API_KEY:
        raise EnvironmentError("GEOAPIFY_API_KEY is not set.")

    centre = _geocode_city(city)
    if centre is None:
        return []
    city_lat, city_lon = centre

    raw = _fetch_raw(city_lat, city_lon, limit=limit, categories=["catering.restaurant"])

    restaurants: list[dict] = []
    seen: set[str] = set()
    for feature in raw:
        props = feature.get("properties", {})
        coords = feature.get("geometry", {}).get("coordinates", [])
        name = _display_name(props).strip()
        if len(name) < 3 or len(coords) < 2:
            continue
        lon, lat = coords[0], coords[1]
        if not _is_valid_coord(lat, lon) or name.lower() in seen:
            continue
        seen.add(name.lower())

        cuisine = (props.get("catering") or {}).get("cuisine")
        restaurants.append({
            "restaurant_name": name,
            "city":      city,
            "area":      props.get("suburb") or props.get("district") or "",
            "cuisine":   cuisine.replace("_", " ").replace(";", ", ").title() if cuisine else None,
            "latitude":  float(lat),
            "longitude": float(lon),
        })
    print(f"  [GeoService] Restaurants for '{city}': {len(restaurants)}")
    return restaurants
