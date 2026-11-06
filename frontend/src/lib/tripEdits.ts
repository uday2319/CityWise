import type {
  Attraction,
  DayItinerary,
  ExplorePlace,
  ItineraryResponse,
} from '../types';
import { mealCost } from './format';

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const toTime = (minutes: number): string => {
  const capped = Math.min(minutes, 23 * 60 + 59);
  const hours = String(Math.floor(capped / 60)).padStart(2, '0');
  return `${hours}:${String(capped % 60).padStart(2, '0')}`;
};

// Same timing rules as DayScheduler._assign_time_slots on the backend.
function reschedule(attractions: Attraction[]): Attraction[] {
  let current = toMinutes('09:00');
  let lunchTaken = false;

  return attractions.map(attraction => {
    if (!lunchTaken && current >= toMinutes('12:00')) {
      current = Math.max(toMinutes('13:30'), current + 60);
      lunchTaken = true;
    }
    const start = current;
    const end = start + Math.round(attraction.visit_duration_hours * 60);
    current = end + 30;
    return { ...attraction, start_time: toTime(start), end_time: toTime(end) };
  });
}

function withAttractions(
  itinerary: ItineraryResponse,
  dayNumber: number,
  attractions: Attraction[]
): ItineraryResponse {
  const transport = itinerary.budget_allocation.transport_allocation_inr;

  const days = itinerary.days.map((day): DayItinerary => {
    if (day.day !== dayNumber) return day;
    const fees = attractions.reduce((sum, a) => sum + (a.entrance_fee || 0), 0);
    const meals = [day.breakfast, day.lunch, day.dinner]
      .reduce((sum, meal) => sum + (mealCost(meal) ?? 0), 0);
    const actual = fees + meals + transport;
    return {
      ...day,
      attractions: reschedule(attractions),
      day_budget_actual: actual,
      budget_utilization_pct:
        day.day_budget_limit > 0 ? (actual / day.day_budget_limit) * 100 : 0,
    };
  });

  return {
    ...itinerary,
    days,
    total_budget_actual: days.reduce((sum, day) => sum + day.day_budget_actual, 0),
  };
}

const dayOf = (itinerary: ItineraryResponse, dayNumber: number) =>
  itinerary.days.find(day => day.day === dayNumber)?.attractions ?? [];

export function moveStop(
  itinerary: ItineraryResponse,
  dayNumber: number,
  index: number,
  direction: -1 | 1
): ItineraryResponse {
  const stops = [...dayOf(itinerary, dayNumber)];
  const target = index + direction;
  if (target < 0 || target >= stops.length) return itinerary;
  [stops[index], stops[target]] = [stops[target], stops[index]];
  return withAttractions(itinerary, dayNumber, stops);
}

export function removeStop(
  itinerary: ItineraryResponse,
  dayNumber: number,
  index: number
): ItineraryResponse {
  const stops = dayOf(itinerary, dayNumber).filter((_, i) => i !== index);
  return withAttractions(itinerary, dayNumber, stops);
}

export function addStop(
  itinerary: ItineraryResponse,
  dayNumber: number,
  place: ExplorePlace
): ItineraryResponse {
  const stop: Attraction = {
    name: place.name,
    category: place.category,
    city: place.city,
    visit_duration_hours: place.visit_duration_hours,
    entrance_fee: 0,
    rating: 0,
    latitude: place.latitude,
    longitude: place.longitude,
    interest_tags: [],
    placeholder_metrics: true,
    opening_hours: place.opening_hours,
  };
  return withAttractions(itinerary, dayNumber, [...dayOf(itinerary, dayNumber), stop]);
}
