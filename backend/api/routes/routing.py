import asyncio
import math
from typing import List, Literal, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.core.config import settings
from backend.services.http_client import get_with_retry

router = APIRouter()

GEOAPIFY_ROUTING_URL = "https://api.geoapify.com/v1/routing"
MAX_CACHE = 500

_MODES = {"drive": "drive", "walk": "walk", "bicycle": "bicycle"}

_route_cache: dict[str, dict] = {}


class Waypoint(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class RouteRequest(BaseModel):
    waypoints: List[Waypoint] = Field(..., min_length=2, max_length=25)
    mode: Literal["drive", "walk", "bicycle"] = "drive"


async def _request_route(waypoints: str, mode: str) -> httpx.Response:
    return await get_with_retry(
        GEOAPIFY_ROUTING_URL,
        params={
            "waypoints": waypoints,
            "mode": _MODES[mode],
            "apiKey": settings.GEOAPIFY_API_KEY,
        },
    )


def _coordinates(points: List[Waypoint]) -> str:
    return "|".join(f"{p.latitude:.6f},{p.longitude:.6f}" for p in points)


def _direct_km(a: Waypoint, b: Waypoint) -> float:
    dlat = math.radians(b.latitude - a.latitude)
    dlon = math.radians(b.longitude - a.longitude)
    h = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(a.latitude))
        * math.cos(math.radians(b.latitude))
        * math.sin(dlon / 2) ** 2
    )
    return 6371 * 2 * math.asin(math.sqrt(h))


async def _route_leg(a: Waypoint, b: Waypoint, mode: str) -> dict:
    """One leg by road, or a clearly marked direct line when there is none."""
    response = await _request_route(_coordinates([a, b]), mode)
    if response.status_code == 400:
        return {
            "distance_km": round(_direct_km(a, b), 2),
            "duration_min": None,
            "routed": False,
            "geometry": [[a.latitude, a.longitude], [b.latitude, b.longitude]],
        }
    response.raise_for_status()
    feature = response.json()["features"][0]
    return {
        "distance_km": round(feature["properties"]["distance"] / 1000, 2),
        "duration_min": round(feature["properties"]["time"] / 60),
        "routed": True,
        "geometry": [
            [round(lat, 6), round(lon, 6)]
            for line in feature["geometry"]["coordinates"]
            for lon, lat in line
        ],
    }


def _summary(mode: str, legs: list[dict], partial: bool) -> dict:
    return {
        "mode": mode,
        "partial": partial,
        "distance_km": round(sum(l["distance_km"] for l in legs if l["routed"]), 2),
        "duration_min": sum(l["duration_min"] for l in legs if l["routed"]),
        "legs": legs,
    }


@router.post("/route")
async def road_route(request: RouteRequest):
    """
    A route along real roads through the waypoints, in order, with one leg
    per pair of waypoints. Geometry is [lat, lon] for Leaflet.
    """
    if not settings.GEOAPIFY_API_KEY:
        raise HTTPException(status_code=503, detail="Road routing is not configured.")

    waypoints = _coordinates(request.waypoints)
    key = f"{request.mode}:{waypoints}"
    if key in _route_cache:
        return _route_cache[key]

    try:
        response = await _request_route(waypoints, request.mode)
        if response.status_code == 400:
            # A stop with no road nearby, such as one on a lake, fails the
            # whole request. Route each leg so only those legs are affected.
            pairs = zip(request.waypoints, request.waypoints[1:])
            legs = await asyncio.gather(
                *(_route_leg(a, b, request.mode) for a, b in pairs)
            )
            result = _summary(request.mode, list(legs), partial=True)
            if len(_route_cache) < MAX_CACHE:
                _route_cache[key] = result
            return result
        response.raise_for_status()
        feature = response.json()["features"][0]
        properties = feature["properties"]
        legs = properties["legs"]
        lines = feature["geometry"]["coordinates"]
        if len(legs) != len(lines):
            raise ValueError("legs and geometry do not match")
    except httpx.HTTPError as exc:
        # str(exc) can include the request URL, and with it the API key.
        print(f"  [Routing] Request failed: {type(exc).__name__}")
        raise HTTPException(status_code=502, detail="Road routing is unavailable right now.")
    except (KeyError, IndexError, ValueError, TypeError):
        raise HTTPException(status_code=502, detail="No road route was found for these stops.")

    result = _summary(
        request.mode,
        [
            {
                "distance_km": round(leg["distance"] / 1000, 2),
                "duration_min": round(leg["time"] / 60),
                "routed": True,
                "geometry": [[round(lat, 6), round(lon, 6)] for lon, lat in line],
            }
            for leg, line in zip(legs, lines)
        ],
        partial=False,
    )

    if len(_route_cache) < MAX_CACHE:
        _route_cache[key] = result
    return result
