from fastapi import APIRouter, Query, HTTPException
from fastapi.concurrency import run_in_threadpool
import pandas as pd
import os
from typing import Optional

from backend.services.geo_service import INTEREST_CATEGORIES, search_places

router = APIRouter()
_df_cache = None


def get_attractions_df():
    global _df_cache
    if _df_cache is None:
        path = "data/processed/attractions_featured.csv"
        if os.path.exists(path):
            _df_cache = pd.read_csv(path)
    return _df_cache


@router.get("/explore")
async def explore_attractions(
    city: str = Query(..., min_length=2, max_length=100),
    interest: Optional[str] = Query(None),
    limit: int = Query(60, ge=1, le=100),
):
    """Live places for a city, optionally narrowed to one interest."""
    if interest and interest not in INTEREST_CATEGORIES:
        raise HTTPException(status_code=422, detail=f"Unknown interest '{interest}'")

    try:
        places = await run_in_threadpool(search_places, city.strip(), interest, limit)
    except EnvironmentError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return {"city": city, "interest": interest, "count": len(places), "places": places}


@router.get("/search")
async def search_attractions(
    city: str = Query(...),
    limit: int = Query(20, le=100),
):
    df = get_attractions_df()
    if df is None:
        raise HTTPException(status_code=503, detail="Attractions data not loaded")

    city_df = df[df["city"].str.lower().str.contains(city.lower(), na=False)]
    city_df = city_df.sort_values("rating", ascending=False).head(limit)

    return {
        "city": city,
        "count": len(city_df),
        "attractions": city_df[["attraction_name", "city", "category", "rating", "entrance_fee", "latitude", "longitude"]].to_dict("records"),
    }