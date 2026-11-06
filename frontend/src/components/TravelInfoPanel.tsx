import { useQuery } from '@tanstack/react-query';
import {
  Bookmark,
  BookmarkCheck,
  Download,
  Droplets,
  RefreshCw,
  Route,
  Thermometer,
  Wind,
} from 'lucide-react';
import { itineraApi } from '../api/itineraApi';
import type { DayItinerary, Trip } from '../types';
import {
  estimateTravelMinutes,
  formatMinutes,
  hasCoord,
  inr,
  tripProgress,
} from '../lib/format';
import { Skeleton } from './ui';

function WeatherCard({ trip }: { trip: Trip }) {
  // Weather is for the city, so it stays the same as the selected day changes.
  const place = trip.itinerary.days.flatMap(d => d.attractions).find(hasCoord);
  const lat = Number(Number(place?.latitude).toFixed(1));
  const lon = Number(Number(place?.longitude).toFixed(1));

  const { data, isLoading, isError } = useQuery({
    queryKey: ['weather', lat, lon],
    queryFn: () => itineraApi.getWeather(lat, lon),
    enabled: !!place,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="rounded-2xl bg-forest-800 p-4 text-white">
      <p className="text-xs font-semibold text-forest-200">Destination</p>
      <h2 className="text-xl font-extrabold">{trip.itinerary.city}</h2>

      {isLoading && <Skeleton className="mt-3 h-14 bg-white/15" />}
      {(isError || !place) && (
        <p className="mt-2 text-sm text-forest-100">Weather is unavailable right now.</p>
      )}
      {data && (
        <>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-3xl font-extrabold">{Math.round(data.temperature_c)}°C</span>
            <span className="text-right text-sm font-semibold">{data.condition}</span>
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs text-forest-100">
            <span className="flex items-center gap-1">
              <Thermometer size={12} /> {Math.round(data.low_c)}–{Math.round(data.high_c)}°C
            </span>
            <span className="flex items-center gap-1">
              <Droplets size={12} /> {data.humidity_pct}%
            </span>
            <span className="flex items-center gap-1">
              <Wind size={12} /> {Math.round(data.wind_kmh)} km/h
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-forest-200">Now, not a forecast for your trip dates</p>
        </>
      )}
    </div>
  );
}

function BudgetRing({ percent }: { percent: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const shown = Math.min(percent, 100);
  const over = percent > 100;

  return (
    <div className="relative h-16 w-16 flex-shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#EEF5F1" strokeWidth="7" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={over ? '#B91C1C' : '#F28C45'}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(shown / 100) * circumference} ${circumference}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
        {Math.round(percent)}%
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-canvas p-2.5">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

export default function TravelInfoPanel({
  trip,
  day,
  regenerating,
  onSave,
  onDownload,
  onRegenerate,
  onRouteDetails,
}: {
  trip: Trip;
  day: DayItinerary;
  regenerating: boolean;
  onSave: () => void;
  onDownload: () => void;
  onRegenerate: () => void;
  onRouteDetails: () => void;
}) {
  const { itinerary, travellers } = trip;
  const progress = tripProgress(trip);
  const travelMinutes = estimateTravelMinutes(day.total_distance_km);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="min-h-0 flex-1 space-y-3 xl:overflow-y-auto">
        <WeatherCard trip={trip} />

        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center gap-3">
            <BudgetRing percent={day.budget_utilization_pct} />
            <div className="min-w-0">
              <p className="text-sm font-bold">Day {day.day} spending</p>
              <p className="text-sm text-ink-soft">
                {inr(day.day_budget_actual)} of {inr(day.day_budget_limit)} per person
              </p>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Stat label="Daily budget" value={inr(itinerary.budget_per_day_inr)} />
            <Stat
              label={travellers > 1 ? `Trip total (${travellers})` : 'Trip total'}
              value={inr(itinerary.total_budget_actual * travellers)}
            />
            <Stat label="Distance" value={`${day.total_distance_km.toFixed(1)} km`} />
            <Stat label="Travel time" value={`~${formatMinutes(travelMinutes)}`} />
            <Stat label="Attractions" value={String(day.attractions.length)} />
            <Stat label="Meals" value={String([day.lunch, day.dinner].filter(Boolean).length)} />
          </dl>

          {(day.lunch || day.dinner) && (
            <div className="mt-3 border-t border-line pt-3 text-sm">
              {day.lunch && (
                <p className="truncate">
                  <span className="font-semibold">Lunch:</span> {day.lunch.restaurant_name}
                </p>
              )}
              {day.dinner && (
                <p className="truncate">
                  <span className="font-semibold">Dinner:</span> {day.dinner.restaurant_name}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
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
            <div
              className="h-full rounded-full bg-teal-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">Tick off stops in the itinerary as you visit them.</p>
        </div>
      </div>

      <div className="grid flex-shrink-0 grid-cols-2 gap-2">
        <button type="button" onClick={onSave} disabled={trip.saved} className="btn-primary">
          {trip.saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          {trip.saved ? 'Saved' : 'Save'}
        </button>
        <button type="button" onClick={onDownload} className="btn-secondary">
          <Download size={16} /> Download
        </button>
        <button type="button" onClick={onRegenerate} disabled={regenerating} className="btn-secondary">
          <RefreshCw size={16} className={regenerating ? 'animate-spin' : ''} />
          {regenerating ? 'Working' : 'Regenerate'}
        </button>
        <button type="button" onClick={onRouteDetails} className="btn-secondary">
          <Route size={16} /> Route details
        </button>
      </div>
    </div>
  );
}
