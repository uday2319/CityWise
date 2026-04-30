export interface ItineraryRequest {
  city: string;
  duration_days: number;
  budget_per_day_inr: number;       // e.g. 3000.0 — exact INR per day
  preference_text: string;          // natural language, encoded live by SBERT
  max_total_budget_inr?: number;    // optional hard total cap
}

export interface BudgetAllocation {
  daily_budget_inr: number;
  label: string;                    // "Budget Traveller" | "Comfortable" etc.
  max_entrance_fee_inr: number;
  max_lunch_cost_for_two_inr: number;
  max_dinner_cost_for_two_inr: number;
  transport_allocation_inr: number;
}

export interface Attraction {
  name: string;
  category: string;
  city: string;
  visit_duration_hours: number;
  entrance_fee: number;
  rating: number;
  latitude?: number;
  longitude?: number;
  start_time?: string;
  end_time?: string;
  interest_tags: string[];
  semantic_score?: number;          // SBERT similarity score (0–1)
}

export interface Restaurant {
  restaurant_name?: string;
  cuisine?: string;
  rating?: number;
  cost_for_two?: number;
  area?: string;
  latitude?: number;
  longitude?: number;
}

export interface DayItinerary {
  day: number;
  title: string;
  attractions: Attraction[];
  lunch?: Restaurant;
  dinner?: Restaurant;
  day_budget_actual: number;        // computed actual cost
  day_budget_limit: number;         // budget_per_day_inr constraint
  budget_utilization_pct: number;   // actual / limit × 100
  total_distance_km: number;
}

export interface ItineraryResponse {
  id?: number;
  session_id: string;
  city: string;
  duration_days: number;
  budget_per_day_inr: number;       // echoed back from request
  budget_label: string;             // "Comfortable Travel" etc.
  preference_text: string;          // user's original query
  days: DayItinerary[];
  total_budget_actual: number;
  total_budget_limit: number;
  budget_allocation: BudgetAllocation;
  created_at: string;
}

export interface BudgetSummary {
  budget_per_day_inr: number;
  budget_label: string;
  total_budget_actual: number;
  total_budget_limit: number;
  daily_avg_actual: number;
  attraction_costs_total: number;
  food_costs_total: number;
  transport_estimate_total: number;
  budget_utilization_pct: number;
  breakdown_per_day: Array<{
    day: number;
    budget_actual: number;
    budget_limit: number;
    budget_utilization_pct: number;
  }>;
  budget_allocation: BudgetAllocation;
}