from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime


class ItineraryRequest(BaseModel):
    """
    Request body for POST /api/v1/itinerary/generate

    Fields:
        city              — Target Indian city (e.g. "Delhi", "Jaipur")
        duration_days     — Trip length in days (1–14)
        budget_per_day_inr— User's actual daily budget in Indian Rupees.
                            This is a concrete number, not a category.
                            Example: 3000.0 means the user can spend ₹3,000/day.
                            Used for:
                              - Filtering attractions (entrance_fee ≤ 25% of this)
                              - Filtering restaurants (cost_for_two ≤ 40-50% of this)
                              - Computing total trip cost estimate
        preference_text   — Natural language description of travel style.
                            This is encoded live by Sentence-BERT at inference time.
                            Example: "I love ancient forts and local street food"
        max_total_budget_inr — Optional hard cap on total trip cost (all days combined).
                            If provided, daily budget is min(budget_per_day_inr,
                            max_total_budget_inr / duration_days).
    """

    city: str = Field(
        ...,
        min_length=2,
        max_length=100,
        example="Delhi",
        description="Target city for the trip"
    )

    duration_days: int = Field(
        ...,
        ge=1,
        le=14,
        example=3,
        description="Number of days for the trip (1 to 14)"
    )

    budget_per_day_inr: float = Field(
        ...,
        ge=500.0,
        le=100000.0,
        example=3000.0,
        description=(
            "Daily budget in Indian Rupees (INR). "
            "Must be between ₹500 and ₹1,00,000. "
            "The system uses this to filter attractions and restaurants precisely. "
            "Example: 3000.0 → attractions ≤ ₹750 entry fee, "
            "restaurants ≤ ₹1,200 for two at lunch."
        )
    )

    preference_text: str = Field(
        ...,
        min_length=5,
        max_length=500,
        example="I love ancient forts and local street food markets",
        description=(
            "Natural language description of travel preferences. "
            "This exact text is encoded by Sentence-BERT for semantic search. "
            "Write freely — the AI understands natural sentences."
        )
    )

    max_total_budget_inr: Optional[float] = Field(
        None,
        ge=500.0,
        description=(
            "Optional hard cap on total trip budget across all days. "
            "If provided, the effective daily budget becomes "
            "min(budget_per_day_inr, max_total_budget_inr / duration_days)."
        )
    )

    exclude_places: Optional[List[str]] = Field(
        None,
        max_length=300,
        description=(
            "Optional attraction names to leave out, used to regenerate a "
            "different plan. Ignored if too few places would remain."
        )
    )

    @validator("preference_text")
    def preference_text_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("preference_text must not be empty")
        return v.strip()

    @validator("city")
    def city_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("city must not be empty")
        return v.strip()

    @validator("budget_per_day_inr")
    def budget_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("budget_per_day_inr must be greater than 0")
        return round(v, 2)

    def effective_daily_budget(self) -> float:
        """
        Returns the effective daily budget after applying the total cap.
        If max_total_budget_inr is set, the per-day budget is capped.
        """
        if self.max_total_budget_inr is not None:
            cap_per_day = self.max_total_budget_inr / self.duration_days
            return min(self.budget_per_day_inr, cap_per_day)
        return self.budget_per_day_inr


# ── Budget allocation helpers (used by multiple layers) ───────────────────────

class BudgetAllocation:
    """
    Computes concrete INR limits from the daily budget.
    These fractions are used consistently by:
      - AttractionRecommender (content filter)
      - DayScheduler (constraint enforcement)
      - BudgetPanel (frontend display)
    """

    ATTRACTION_FRACTION = 0.25   # 25% for entrance fees per attraction
    LUNCH_FRACTION      = 0.40   # 40% for lunch (cost_for_two)
    DINNER_FRACTION     = 0.50   # 50% for dinner (cost_for_two)
    TRANSPORT_FRACTION  = 0.15   # 15% fixed transport allocation
    MISC_FRACTION       = 0.10   # 10% miscellaneous

    def __init__(self, budget_per_day_inr: float):
        self.daily = budget_per_day_inr

    @property
    def max_entrance_fee(self) -> float:
        """Max INR entrance fee per attraction."""
        return self.daily * self.ATTRACTION_FRACTION

    @property
    def max_lunch_cost_for_two(self) -> float:
        """Max INR cost_for_two for lunch restaurant."""
        return self.daily * self.LUNCH_FRACTION

    @property
    def max_dinner_cost_for_two(self) -> float:
        """Max INR cost_for_two for dinner restaurant."""
        return self.daily * self.DINNER_FRACTION

    @property
    def transport_allocation(self) -> float:
        """INR allocated to transport per day."""
        return self.daily * self.TRANSPORT_FRACTION

    @property
    def misc_allocation(self) -> float:
        """INR allocated to miscellaneous per day."""
        return self.daily * self.MISC_FRACTION

    def label(self) -> str:
        """Human-readable budget tier label (for display only — not used in filtering)."""
        if self.daily < 1500:
            return "Budget Traveller"
        elif self.daily < 3500:
            return "Comfortable Travel"
        elif self.daily < 8000:
            return "Premium Experience"
        else:
            return "Luxury Travel"

    def summary_dict(self) -> dict:
        """Return allocation as a dict for API responses."""
        return {
            "daily_budget_inr": self.daily,
            "label": self.label(),
            "max_entrance_fee_inr": round(self.max_entrance_fee, 2),
            "max_lunch_cost_for_two_inr": round(self.max_lunch_cost_for_two, 2),
            "max_dinner_cost_for_two_inr": round(self.max_dinner_cost_for_two, 2),
            "transport_allocation_inr": round(self.transport_allocation, 2),
        }


# ── Response schemas ──────────────────────────────────────────────────────────

class AttractionResponse(BaseModel):
    name: str
    category: str
    city: str
    visit_duration_hours: float
    entrance_fee: float
    rating: float
    latitude: Optional[float]
    longitude: Optional[float]
    start_time: Optional[str]
    end_time: Optional[str]
    interest_tags: List[str]
    semantic_score: Optional[float] = None   # SBERT similarity score
    # True when rating/entrance_fee are defaults, not real data (Geoapify
    # supplies neither). Clients should not display them as facts.
    placeholder_metrics: bool = False

    class Config:
        from_attributes = True


class RestaurantResponse(BaseModel):
    restaurant_name: Optional[str]
    cuisine: Optional[str]
    rating: Optional[float]
    cost_for_two: Optional[float]
    area: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    cost_is_estimate: bool = False    # True when cost_for_two is not real data

    class Config:
        from_attributes = True


class DayItinerary(BaseModel):
    day: int
    title: str
    attractions: List[AttractionResponse]
    lunch: Optional[RestaurantResponse]
    dinner: Optional[RestaurantResponse]
    day_budget_actual: float          # actual computed cost for this day
    day_budget_limit: float           # the budget_per_day_inr constraint
    budget_utilization_pct: float     # actual / limit × 100
    total_distance_km: float


class ItineraryResponse(BaseModel):
    id: Optional[int]
    session_id: str
    city: str
    duration_days: int
    budget_per_day_inr: float         # echoed back — numeric, not categorical
    budget_label: str                 # e.g. "Comfortable Travel" — display only
    preference_text: str              # original user query
    days: List[DayItinerary]
    total_budget_actual: float        # sum of all day_budget_actual
    total_budget_limit: float         # budget_per_day_inr × duration_days
    budget_allocation: dict           # breakdown of allocation fractions
    created_at: datetime

    class Config:
        from_attributes = True


class BudgetSummary(BaseModel):
    budget_per_day_inr: float
    budget_label: str
    total_budget_actual: float
    total_budget_limit: float
    daily_avg_actual: float
    attraction_costs_total: float
    food_costs_total: float
    transport_estimate_total: float
    budget_utilization_pct: float
    breakdown_per_day: List[dict]
    budget_allocation: dict