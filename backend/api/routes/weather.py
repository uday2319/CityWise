import time

import httpx
from fastapi import APIRouter, HTTPException, Query

from backend.services.http_client import get_client

router = APIRouter()

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
CACHE_SECONDS = 600

_weather_cache: dict[tuple[float, float], tuple[float, dict]] = {}

# WMO weather interpretation codes used by Open-Meteo
_CONDITIONS = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Icy fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow",
    80: "Rain showers", 81: "Rain showers", 82: "Heavy showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail",
}


@router.get("/current")
async def current_weather(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    """Current conditions and today's range for a location."""
    key = (round(lat, 2), round(lon, 2))
    cached = _weather_cache.get(key)
    if cached and time.time() - cached[0] < CACHE_SECONDS:
        return cached[1]

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,apparent_temperature,relative_humidity_2m,"
                   "weather_code,wind_speed_10m",
        "daily": "temperature_2m_max,temperature_2m_min,weather_code",
        "forecast_days": 3,
        "timezone": "auto",
    }

    try:
        response = await get_client().get(OPEN_METEO_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        current = data["current"]
        daily = data["daily"]
        result = {
            "temperature_c": current["temperature_2m"],
            "feels_like_c": current["apparent_temperature"],
            "humidity_pct": current["relative_humidity_2m"],
            "wind_kmh": current["wind_speed_10m"],
            "condition": _CONDITIONS.get(current["weather_code"], "Unknown"),
            "weather_code": current["weather_code"],
            "high_c": daily["temperature_2m_max"][0],
            "low_c": daily["temperature_2m_min"][0],
            "forecast": [
                {
                    "date": date,
                    "high_c": high,
                    "low_c": low,
                    "condition": _CONDITIONS.get(code, "Unknown"),
                }
                for date, high, low, code in zip(
                    daily["time"],
                    daily["temperature_2m_max"],
                    daily["temperature_2m_min"],
                    daily["weather_code"],
                )
            ],
        }
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        print(f"  [Weather] Lookup failed: {exc}")
        raise HTTPException(status_code=502, detail="Weather service unavailable")

    _weather_cache[key] = (time.time(), result)
    return result
