import pandas as pd
from fastapi import APIRouter, Query
import os

router = APIRouter()
_cities_cache = None


def get_cities():
    global _cities_cache
    if _cities_cache is None:
        path = "data/processed/cities.csv"
        if os.path.exists(path):
            df = pd.read_csv(path)
            _cities_cache = df["city"].dropna().unique().tolist()
        else:
            _cities_cache = ["Delhi", "Mumbai", "Bangalore", "Jaipur", "Goa", "Chennai", "Kolkata", "Hyderabad"]
    return _cities_cache


@router.get("/search")
async def search_cities(q: str = Query(..., min_length=1)):
    """Search cities by prefix — used for autocomplete."""
    cities = get_cities()
    q_lower = q.lower()
    matches = [c for c in cities if c.lower().startswith(q_lower)][:10]
    return {"cities": matches}


@router.get("/popular")
async def popular_cities():
    """Return popular tourist cities."""
    return {
        "cities": [
            {"name": "Delhi", "state": "Delhi", "attractions": 120},
            {"name": "Mumbai", "state": "Maharashtra", "attractions": 89},
            {"name": "Jaipur", "state": "Rajasthan", "attractions": 67},
            {"name": "Goa", "state": "Goa", "attractions": 54},
            {"name": "Agra", "state": "Uttar Pradesh", "attractions": 43},
            {"name": "Varanasi", "state": "Uttar Pradesh", "attractions": 38},
            {"name": "Udaipur", "state": "Rajasthan", "attractions": 45},
            {"name": "Bangalore", "state": "Karnataka", "attractions": 72},
        ]
    }