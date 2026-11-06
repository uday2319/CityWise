import type {
  Attraction,
  DayItinerary,
  Hotel,
  Restaurant,
  RouteMode,
  Trip,
} from '../types';

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

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export const ROUTE_MODES: { key: RouteMode; label: string }[] = [
  { key: 'drive', label: 'Driving' },
  { key: 'walk', label: 'Walking' },
  { key: 'bicycle', label: 'Cycling' },
];

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

export type DayPart = 'Morning' | 'Afternoon' | 'Evening';
export type MealKind = 'breakfast' | 'lunch' | 'dinner';

export type TimelineItem =
  | { kind: 'stop'; key: string; time: string; flexible: boolean; attraction: Attraction; number: number; index: number }
  | { kind: MealKind; key: string; time: string; meal: Restaurant }
  | { kind: 'hotel'; key: string; time: string; hotel: Hotel; leaving: boolean };

const FLEXIBLE_TIME = '10:00';

function lunchTime(day: DayItinerary): string {
  const beforeLunch = day.attractions
    .filter(a => a.start_time && a.start_time < '12:00' && a.end_time)
    .map(a => a.end_time as string)
    .sort();
  const lastEnd = beforeLunch[beforeLunch.length - 1];
  return lastEnd && lastEnd > '12:30' ? lastEnd : '12:30';
}

/** The whole day in order: hotel, meals and attractions together. */
export function dayItems(day: DayItinerary): TimelineItem[] {
  const items: TimelineItem[] = day.attractions.map((attraction, index) => ({
    kind: 'stop',
    key: stopKey(day.day, attraction),
    time: attraction.start_time ?? FLEXIBLE_TIME,
    flexible: !attraction.start_time,
    attraction,
    number: index + 1,
    index,
  }));

  if (day.hotel) {
    items.push({ kind: 'hotel', key: `${day.day}:hotel-out`, time: '08:00', hotel: day.hotel, leaving: true });
    items.push({ kind: 'hotel', key: `${day.day}:hotel-in`, time: '21:00', hotel: day.hotel, leaving: false });
  }
  if (day.breakfast) items.push({ kind: 'breakfast', key: `${day.day}:breakfast`, time: '08:15', meal: day.breakfast });
  if (day.lunch) items.push({ kind: 'lunch', key: `${day.day}:lunch`, time: lunchTime(day), meal: day.lunch });
  if (day.dinner) items.push({ kind: 'dinner', key: `${day.day}:dinner`, time: '19:30', meal: day.dinner });

  return items.sort((a, b) => a.time.localeCompare(b.time));
}

export function buildTimeline(day: DayItinerary): [DayPart, TimelineItem[]][] {
  const partOf = (time: string): DayPart => {
    if (time < '12:00') return 'Morning';
    return time < '17:00' ? 'Afternoon' : 'Evening';
  };
  const items = dayItems(day);
  return (['Morning', 'Afternoon', 'Evening'] as DayPart[])
    .map((part): [DayPart, TimelineItem[]] => [
      part,
      items.filter(item => partOf(item.time) === part),
    ])
    .filter(([, group]) => group.length > 0);
}

const placeOf = (item: TimelineItem): Located & { name: string } => {
  if (item.kind === 'stop') return item.attraction;
  if (item.kind === 'hotel') return item.hotel;
  return { ...item.meal, name: item.meal.restaurant_name ?? 'Restaurant' };
};

export interface Waypoint {
  key: string;
  name: string;
  latitude: number;
  longitude: number;
}

/** Every mappable point of the day, in the order the traveller reaches it. */
export const dayWaypoints = (day: DayItinerary): Waypoint[] =>
  dayItems(day).flatMap(item => {
    const place = placeOf(item);
    return hasCoord(place)
      ? [{
          key: item.key,
          name: place.name,
          latitude: Number(place.latitude),
          longitude: Number(place.longitude),
        }]
      : [];
  });

/** What is known about a stop's price. Geoapify places have no fee data. */
export function feeLabel(attraction: Attraction): string {
  if (attraction.placeholder_metrics) return 'Fee not listed';
  return attraction.entrance_fee > 0 ? inr(attraction.entrance_fee) : 'Free entry';
}

export const hasRealRating = (rating?: number | null, placeholder?: boolean) =>
  !placeholder && !!rating && rating > 0;

export const cleanTitle = (title: string, day: number): string =>
  title.replace(new RegExp(`^Day ${day}\\s*.\\s*`), '');

/** The calendar date of a trip day, when the trip has a start date. */
export function dayDate(startDate: string | undefined, day: number): string | null {
  if (!startDate) return null;
  const date = new Date(`${startDate}T00:00:00`);
  date.setDate(date.getDate() + day - 1);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
