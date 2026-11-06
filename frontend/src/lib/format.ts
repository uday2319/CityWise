import type { Attraction, DayItinerary, Restaurant, Trip } from '../types';

export const inr = (amount: number): string =>
  `₹${Math.round(amount).toLocaleString('en-IN')}`;

type Located = { latitude?: number | null; longitude?: number | null };

export function isValidCoord(lat: unknown, lng: unknown): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  const la = Number(lat);
  const lo = Number(lng);
  return (
    Number.isFinite(la) && Number.isFinite(lo) &&
    la !== 0 && lo !== 0 &&
    la >= -90 && la <= 90 &&
    lo >= -180 && lo <= 180
  );
}

export const hasCoord = (place: Located): boolean =>
  isValidCoord(place.latitude, place.longitude);

export function haversineKm(a: Located, b: Located): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(Number(b.latitude) - Number(a.latitude));
  const dLon = rad(Number(b.longitude) - Number(a.longitude));
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(Number(a.latitude))) * Math.cos(rad(Number(b.latitude))) *
      Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// Straight-line km to rough city driving time: roads wind about 1.3× the
// direct distance, and urban traffic averages about 20 km/h.
export const estimateTravelMinutes = (km: number): number =>
  Math.round(((km * 1.3) / 20) * 60);

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Per-person meal price, or null when the restaurant has no price. */
export const mealCost = (meal?: Restaurant | null): number | null =>
  meal?.cost_for_two ? meal.cost_for_two / 2 : null;

/** Stable identity for a stop within a trip. */
export const stopKey = (day: number, attraction: Attraction): string =>
  `${day}:${attraction.name}`;

export const tripStopKeys = (days: DayItinerary[]): string[] =>
  days.flatMap(day => day.attractions.map(a => stopKey(day.day, a)));

export function tripProgress(trip: Trip): number {
  const keys = tripStopKeys(trip.itinerary.days);
  if (keys.length === 0) return 0;
  const done = keys.filter(key => trip.visited.includes(key)).length;
  return Math.round((done / keys.length) * 100);
}

export const directionsUrl = (stops: Located[]): string => {
  const points = stops.map(s => `${s.latitude},${s.longitude}`);
  const params = new URLSearchParams({
    api: '1',
    origin: points[0],
    destination: points[points.length - 1],
    travelmode: 'driving',
  });
  if (points.length > 2) {
    params.set('waypoints', points.slice(1, -1).join('|'));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

export const placeUrl = (name: string, place: Located): string =>
  `https://www.google.com/maps/search/?${new URLSearchParams({
    api: '1',
    query: hasCoord(place) ? `${place.latitude},${place.longitude}` : name,
  }).toString()}`;

export type DayPart = 'Morning' | 'Afternoon' | 'Evening' | 'Any time';

export type TimelineItem =
  | { kind: 'stop'; time?: string | null; attraction: Attraction; number: number }
  | { kind: 'lunch' | 'dinner'; time: string; meal: Restaurant };

export function buildTimeline(day: DayItinerary): [DayPart, TimelineItem[]][] {
  const items: TimelineItem[] = day.attractions.map((attraction, index) => ({
    kind: 'stop',
    time: attraction.start_time,
    attraction,
    number: index + 1,
  }));
  if (day.lunch) items.push({ kind: 'lunch', time: '12:30', meal: day.lunch });
  if (day.dinner) items.push({ kind: 'dinner', time: '19:30', meal: day.dinner });

  const partOf = (time?: string | null): DayPart => {
    if (!time) return 'Any time';
    if (time < '12:00') return 'Morning';
    return time < '17:00' ? 'Afternoon' : 'Evening';
  };

  const sorted = [...items].sort((a, b) =>
    (a.time ?? '').localeCompare(b.time ?? '')
  );

  const order: DayPart[] = ['Any time', 'Morning', 'Afternoon', 'Evening'];
  return order
    .map((part): [DayPart, TimelineItem[]] => [
      part,
      sorted.filter(item => partOf(item.time) === part),
    ])
    .filter(([, group]) => group.length > 0);
}

/** What is known about a stop's price. Geoapify places have no fee data. */
export function feeLabel(attraction: Attraction): string {
  if (attraction.placeholder_metrics) return 'Fee not listed';
  return attraction.entrance_fee > 0 ? inr(attraction.entrance_fee) : 'Free entry';
}

export const hasRealRating = (rating?: number | null, placeholder?: boolean) =>
  !placeholder && !!rating && rating > 0;

export const cleanTitle = (title: string, day: number): string =>
  title.replace(new RegExp(`^Day ${day}\\s*.\\s*`), '');
