from fastapi import APIRouter, HTTPException
from typing import Optional

router = APIRouter()


@router.get("/trip-stats/{session_id}")
async def get_trip_stats(session_id: str):
    """Return analytics for a generated trip."""
    return {
        "session_id": session_id,
        "message": "Analytics endpoint ready. Connect to your itinerary data.",
    }


@router.get("/popular-interests")
async def popular_interests():
    """Return popular interest combinations."""
    return {
        "trends": [
            {"interest": "history", "popularity": 87},
            {"interest": "food", "popularity": 82},
            {"interest": "culture", "popularity": 74},
            {"interest": "nature", "popularity": 68},
            {"interest": "architecture", "popularity": 61},
        ]
    }