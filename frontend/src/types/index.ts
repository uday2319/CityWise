export interface ItineraryRequest {
  city: string;
  duration_days: number;
  budget_per_day_inr: number;       // e.g. 3000.0 — exact INR per day
  preference_text: string;          // natural language, encoded live by SBERT
  max_total_budget_inr?: number;    // optional hard total cap
  exclude_places?: string[];        // names to avoid when regenerating
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
  latitude?: number | null;
  longitude?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  interest_tags: string[];
  semantic_score?: number | null;   // SBERT similarity score (0–1)
  placeholder_metrics?: boolean;    // rating and fee are defaults, not data
}

export interface Restaurant {
  restaurant_name?: string | null;
  cuisine?: string | null;
  rating?: number | null;
  cost_for_two?: number | null;
  area?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  cost_is_estimate?: boolean;       // cost_for_two is assumed, not data
}

export interface DayItinerary {
  day: number;
  title: string;
  attractions: Attraction[];
  lunch?: Restaurant | null;
  dinner?: Restaurant | null;
  day_budget_actual: number;        // computed actual cost
  day_budget_limit: number;         // budget_per_day_inr constraint
  budget_utilization_pct: number;   // actual / limit × 100
  total_distance_km: number;
}

export interface ItineraryResponse {
  id?: number | null;
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

export interface ExplorePlace {
  id: string;
  name: string;
  category: string;
  city: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  website?: string | null;
  opening_hours?: string | null;
  visit_duration_hours: number;
  rating?: number | null;
}

export interface PlacePhoto {
  found: boolean;
  url?: string;
  title?: string;
  description?: string | null;
  source_url?: string;
}

export interface Weather {
  temperature_c: number;
  feels_like_c: number;
  humidity_pct: number;
  wind_kmh: number;
  condition: string;
  weather_code: number;
  high_c: number;
  low_c: number;
}

export interface TranslationResult {
  translated_text: string;
  provider: string;
  confidence: number | null;
  warning: string | null;
}

/** An itinerary plus everything the app remembers about it. */
export interface Trip {
  id: string;
  name: string;
  request: ItineraryRequest;
  itinerary: ItineraryResponse;
  travellers: number;
  saved: boolean;
  startDate?: string;               // yyyy-mm-dd
  visited: string[];                // stop keys ticked off by the traveller
}

export interface Profile {
  name: string;
  homeCity: string;
  travelStyle: string;
  sourceLanguage: string;
  targetLanguage: string;
  savedDestinations: string[];
}
