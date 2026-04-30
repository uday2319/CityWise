from fastapi import APIRouter, Query, HTTPException
import pandas as pd
import os

router = APIRouter()
_df_cache = None


def get_restaurants_df():
    global _df_cache
    if _df_cache is None:
        path = "data/processed/restaurants_featured.csv"
        if os.path.exists(path):
            _df_cache = pd.read_csv(path)
    return _df_cache


@router.get("/search")
async def search_restaurants(
    city: str = Query(...),
    budget: str = Query("mid"),
    limit: int = Query(10, le=50),
):
    df = get_restaurants_df()
    if df is None:
        raise HTTPException(status_code=503, detail="Restaurant data not loaded")

    city_df = df[df["city"].str.lower().str.contains(city.lower(), na=False)]

    budget_max = {"budget": 300, "mid": 800, "premium": 9999}.get(budget, 800)
    if "cost_for_two" in city_df.columns:
        city_df = city_df[city_df["cost_for_two"].fillna(500) <= budget_max]

    city_df = city_df.sort_values("rating", ascending=False).head(limit)

    return {
        "city": city,
        "count": len(city_df),
        "restaurants": city_df[
            ["restaurant_name", "cuisine", "rating", "cost_for_two", "city", "area"]
        ].to_dict("records"),
    }