import { useQuery } from '@tanstack/react-query';
import {
  BedDouble,
  Compass,
  Droplets,
  ExternalLink,
  Landmark,
  Lightbulb,
  Route,
  Thermometer,
  Timer,
  Utensils,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { itineraApi } from '../api/itineraApi';
import type { RoadRoute, RouteMode, Trip, Weather } from '../types';
import { formatMinutes, hasCoord, inr, placeUrl, tripProgress } from '../lib/format';
import { Skeleton } from './ui';

function useTripWeather(trip: Trip) {
  // Weather is for the city, so it stays the same as the selected day changes.
  const place = trip.itinerary.days.flatMap(d => d.attractions).find(hasCoord);
  const lat = Number(Number(place?.latitude).toFixed(1));
  const lon = Number(Number(place?.longitude).toFixed(1));

  return useQuery({
    queryKey: ['weather', lat, lon],
    queryFn: () => itineraApi.getWeather(lat, lon),
    enabled: !!place,
    staleTime: 10 * 60 * 1000,
  });
}

function WeatherCard({ trip, query }: { trip: Trip; query: ReturnType<typeof useTripWeather> }) {
  const { data, isLoading, isError } = query;

  return (
    <div className="rounded-2xl bg-forest-800 p-4 text-white">
      <p className="text-xs font-semibold text-forest-200">Destination</p>
      <h2 className="text-lg font-extrabold">{trip.itinerary.city}</h2>

      {isLoading && <Skeleton className="mt-3 h-14 bg-white/15" />}
      {isError && <p className="mt-2 text-sm text-forest-100">Weather is unavailable right now.</p>}
      {data && (
        <>
          <div className="mt-1 flex items-end justify-between">
            <span className="text-3xl font-extrabold">{Math.round(data.temperature_c)}°C</span>
            <span className="text-right text-sm font-semibold">{data.condition}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-xs text-forest-100">
            <span className="flex items-center gap-1"><Thermometer size={12} /> {Math.round(data.low_c)}–{Math.round(data.high_c)}°C</span>
            <span className="flex items-center gap-1"><Droplets size={12} /> {data.humidity_pct}%</span>
            <span className="flex items-center gap-1"><Wind size={12} /> {Math.round(data.wind_kmh)} km/h</span>
          </div>
          <ul className="mt-2.5 grid grid-cols-3 gap-1.5 border-t border-white/15 pt-2 text-center text-xs">
            {data.forecast.map(day => (
              <li key={day.date}>
                <span className="block text-forest-200">
                  {new Date(`${day.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}
                </span>
                <span className="font-bold">{Math.round(day.high_c)}° / {Math.round(day.low_c)}°</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-forest-200">Current conditions, not your trip dates</p>
        </>
      )}
    </div>
  );
}

function BudgetRing({ percent }: { percent: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const over = percent > 100;

  return (
    <div className="relative h-14 w-14 flex-shrink-0">
      <svg viewBox="0 0 60 60" className="h-14 w-14 -rotate-90" aria-hidden="true">
        <circle cx="30" cy="30" r={radius} fill="none" stroke="#EEF5F1" strokeWidth="6" />
        <circle
          cx="30"
          cy="30"
          r={radius}
          fill="none"
          stroke={over ? '#B91C1C' : '#14B8A6'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(Math.min(percent, 100) / 100) * circumference} ${circumference}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">
        {Math.round(percent)}%
      </span>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-canvas p-2">
      <Icon size={16} className="flex-shrink-0 text-forest-500" />
      <div className="min-w-0">
        <dd className="truncate text-sm font-bold leading-tight">{value}</dd>
        <dt className="truncate text-[11px] text-ink-soft">{label}</dt>
      </div>
    </div>
  );
}

function tipsFor(trip: Trip, weather: Weather | undefined, mode: RouteMode, route?: RoadRoute): string[] {
  const tips: string[] = [];
  const stops = trip.itinerary.days.flatMap(d => d.attractions);

  if (weather && weather.high_c >= 32) tips.push('It’s hot right now. Plan outdoor stops early and carry water.');
  if (/rain|shower|thunder|drizzle/i.test(weather?.condition ?? '')) tips.push('Rain is about. Keep a light rain layer with you.');
  if (mode === 'walk' && route && route.duration_min > 120) tips.push('This day is a long walk. Driving or cycling may suit it better.');
  if (stops.some(a => a.placeholder_metrics)) tips.push('Entry fees aren’t listed here, so keep some cash for tickets.');
  if (trip.itinerary.days.some(d => d.hotel)) tips.push('Hotels are suggestions. Check rooms and prices before you book.');
  return tips.slice(0, 3);
}

export default function TravelInfoPanel({
  trip,
  mode,
  route,
  totals,
  onBudget,
}: {
  trip: Trip;
  mode: RouteMode;
  route?: RoadRoute;
  totals: { complete: boolean; distanceKm: number; durationMin: number };
  onBudget: () => void;
}) {
  const { itinerary, travellers } = trip;
  const weather = useTripWeather(trip);
  const progress = tripProgress(trip);
  const hotel = itinerary.days.find(d => d.hotel)?.hotel;

  const allDays = itinerary.days;
  const attractions = allDays.reduce((sum, d) => sum + d.attractions.length, 0);
  const restaurants = new Set(
    allDays.flatMap(d => [d.breakfast, d.lunch, d.dinner]).flatMap(m => (m?.restaurant_name ? [m.restaurant_name] : []))
  ).size;

  const total = itinerary.total_budget_actual * travellers;
  const limit = itinerary.total_budget_limit * travellers;
  const tips = tipsFor(trip, weather.data, mode, route);

  return (
    <div className="space-y-3 pb-20">
      <WeatherCard trip={trip} query={weather} />

      <div className="rounded-2xl border border-line bg-white p-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink-soft">
              Estimated budget{travellers > 1 ? ` for ${travellers}` : ''}
            </p>
            <p className="text-2xl font-extrabold leading-tight">{inr(total)}</p>
            <button type="button" onClick={onBudget} className="text-xs font-semibold text-forest-700 underline">
              See breakdown
            </button>
          </div>
          <BudgetRing percent={limit > 0 ? (total / limit) * 100 : 0} />
        </div>

        <dl className="mt-2.5 grid grid-cols-2 gap-1.5">
          <Stat icon={Landmark} label="Attractions" value={String(attractions)} />
          <Stat icon={Utensils} label="Restaurants" value={String(restaurants)} />
          <Stat icon={Route} label="Trip distance" value={totals.complete ? `${totals.distanceKm.toFixed(1)} km` : '—'} />
          <Stat icon={Timer} label="Travel time" value={totals.complete ? formatMinutes(totals.durationMin) : '—'} />
        </dl>
      </div>

      <div className="rounded-2xl border border-line bg-white p-3">
        <h3 className="flex items-center gap-1.5 text-sm font-bold">
          <BedDouble size={16} className="text-forest-500" /> Accommodation
        </h3>
        {hotel ? (
          <>
            <p className="mt-1 text-sm font-semibold">{hotel.name}</p>
            <p className="text-xs text-ink-soft">
              {[hotel.area, hotel.stars ? `${hotel.stars}★` : null].filter(Boolean).join(' · ') || 'Suggested stay'}
            </p>
            <p className="text-xs text-ink-soft">Price not available and not in the budget.</p>
            <div className="mt-1 flex gap-3 text-xs font-semibold text-forest-700">
              <a href={placeUrl(hotel.name, hotel)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                Map <ExternalLink size={11} />
              </a>
              {hotel.website && (
                <a href={hotel.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                  Website <ExternalLink size={11} />
                </a>
              )}
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">No hotel was found for this trip.</p>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-white p-3">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-bold">Trip progress</span>
          <span className="font-bold text-forest-700">{progress}%</span>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-forest-50"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Trip progress"
        >
          <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1 text-xs text-ink-soft">Tick stops in the itinerary as you visit them.</p>
      </div>

      {tips.length > 0 && (
        <div className="rounded-2xl bg-ember-50 p-3">
          <h3 className="flex items-center gap-1.5 text-sm font-bold">
            <Lightbulb size={16} className="text-ember-700" /> Travel tips
          </h3>
          <ul className="mt-1 space-y-1 text-xs text-ink">
            {tips.map(tip => <li key={tip}>{tip}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function TripInfoEmpty({ generating }: { generating: boolean }) {
  const steps = [
    'Finding real places in your destination',
    'Matching them to your preferences',
    'Ordering each day to reduce travel',
    'Adding meals, a hotel and road routes',
  ];
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <h2 className="flex items-center gap-2 font-bold">
        <Compass size={18} className="text-forest-500" />
        {generating ? 'Building your trip' : 'Trip information'}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {generating
          ? 'This usually takes under a minute. Longer trips take more time.'
          : 'Your budget, distance, hotel and weather appear here once you generate a trip.'}
      </p>
      <ol className="mt-3 space-y-2">
        {steps.map(step => (
          <li key={step} className="flex items-start gap-2 text-sm text-ink-soft">
            <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${generating ? 'animate-pulse bg-teal-500' : 'bg-forest-200'}`} />
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
