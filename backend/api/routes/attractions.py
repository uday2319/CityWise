from fastapi import APIRouter, Query, HTTPException
import pandas as pd
import os

router = APIRouter()
_df_cache = None


def get_attractions_df():
    global _df_cache
    if _df_cache is None:
        path = "data/processed/attractions_featured.csv"
        if os.path.exists(path):
            _df_cache = pd.read_csv(path)
    return _df_cache


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