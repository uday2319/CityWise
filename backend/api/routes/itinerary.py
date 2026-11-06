from __future__ import annotations

import uuid
import math
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Request

from backend.schemas.itinerary_schema import (
    ItineraryRequest,
    ItineraryResponse,
    BudgetSummary,
    BudgetAllocation,
    DayItinerary,
    AttractionResponse,
    HotelResponse,
    RestaurantResponse,
)

router = APIRouter()


# ✅ Recursive NaN cleaner
def clean_nan_recursive(obj):
    if isinstance(obj, dict):
        return {k: clean_nan_recursive(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan_recursive(v) for v in obj]
    elif isinstance(obj, float) and math.isnan(obj):
        return 0
    else:
        return obj


def _format_restaurant(rest_dict: Optional[dict]) -> Optional[RestaurantResponse]:
    if not rest_dict:
        return None
    return RestaurantResponse(
        restaurant_name=rest_dict.get(
            "restaurant_name", rest_dict.get("name", "Restaurant")
        ),
        cuisine=rest_dict.get("cuisine"),
        rating=rest_dict.get("rating"),
        cost_for_two=rest_dict.get("cost_for_two"),
        area=rest_dict.get("area", ""),
        latitude=rest_dict.get("latitude"),
        longitude=rest_dict.get("longitude"),
        cost_is_estimate=bool(rest_dict.get("cost_is_estimate", False)),
    )


def _format_itinerary_response(
    raw_days: list,
    request: ItineraryRequest,
    session_id: str,
    effective_daily_budget: float,
) -> ItineraryResponse:

    alloc = BudgetAllocation(effective_daily_budget)
    days = []
    total_actual = 0.0

    for day_data in raw_days:
        attractions_resp = [
            AttractionResponse(
                name=a.get("name", ""),
                category=a.get("category", ""),
                city=a.get("city", request.city),
                visit_duration_hours=a.get("visit_duration_hours", 2.0),
                entrance_fee=a.get("entrance_fee", 0),
                rating=a.get("rating", 4.0),
                latitude=a.get("latitude"),
                longitude=a.get("longitude"),
                start_time=a.get("start_time"),
                end_time=a.get("end_time"),
                interest_tags=a.get("interest_tags", []),
                semantic_score=a.get("semantic_score"),
                placeholder_metrics=bool(a.get("placeholder_metrics", False)),
                opening_hours=a.get("opening_hours"),
            )
            for a in day_data.get("attractions", [])
        ]

        day_actual = day_data.get("day_budget_actual", 0.0)
        day_limit  = day_data.get("day_budget_limit", effective_daily_budget)
        util_pct   = day_data.get("budget_utilization_pct", 0.0)

        day = DayItinerary(
            day=day_data["day"],
            title=day_data["title"],
            attractions=attractions_resp,
            hotel=HotelResponse(**day_data["hotel"]) if day_data.get("hotel") else None,
            breakfast=_format_restaurant(day_data.get("breakfast")),
            lunch=_format_restaurant(day_data.get("lunch")),
            dinner=_format_restaurant(day_data.get("dinner")),
            day_budget_actual=day_actual,
            day_budget_limit=day_limit,
            budget_utilization_pct=util_pct,
            total_distance_km=day_data.get("total_distance_km", 0),
        )

        days.append(day)
        total_actual += day_actual

    total_limit = effective_daily_budget * len(days)

    return ItineraryResponse(
        id=None,
        session_id=session_id,
        city=request.city,
        duration_days=request.duration_days,
        budget_per_day_inr=effective_daily_budget,
        budget_label=alloc.label(),
        preference_text=request.preference_text,
        days=days,
        total_budget_actual=round(total_actual, 2),
        total_budget_limit=round(total_limit, 2),
        budget_allocation=alloc.summary_dict(),
        created_at=datetime.utcnow(),
    )


# ✅ MAIN API (DB REMOVED)
@router.post("/generate", response_model=ItineraryResponse)
async def generate_itinerary(
    request_data: ItineraryRequest,
    request: Request,
):

    ml_service = request.app.state.ml_service
    session_id = str(uuid.uuid4())

    effective_budget = request_data.effective_daily_budget()

    try:
        raw_itinerary = ml_service.generate_itinerary(
            city=request_data.city,
            duration_days=request_data.duration_days,
            budget_per_day_inr=effective_budget,
            preference_text=request_data.preference_text,
            max_total_budget_inr=request_data.max_total_budget_inr,
            exclude_places=request_data.exclude_places,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"ML pipeline error: {str(e)}"
        )

    response = _format_itinerary_response(
        raw_itinerary, request_data, session_id, effective_budget
    )

    # ✅ FINAL FIX — CLEAN EVERYTHING
    return clean_nan_recursive(response.model_dump())


# ✅ Budget summary (DB removed)
@router.get("/budget-summary/{session_id}", response_model=BudgetSummary)
async def get_budget_summary(session_id: str):
    raise HTTPException(
        status_code=501,
        detail="Budget summary disabled (DB not connected)"
    )