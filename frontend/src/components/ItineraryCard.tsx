import {
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  MapPin,
  Star,
  Utensils,
} from 'lucide-react';
import type { Attraction, DayItinerary, Restaurant } from '../types';
import {
  buildTimeline,
  feeLabel,
  hasRealRating,
  inr,
  mealCost,
  placeUrl,
  stopKey,
} from '../lib/format';
import { PlaceImage, usePhoto } from './ui';

function StopDetails({ attraction, city }: { attraction: Attraction; city: string }) {
  const { data: photo } = usePhoto(attraction.name, city);

  return (
    <div className="mt-2.5 space-y-2 text-sm text-ink-soft">
      {photo?.description && <p>{photo.description}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <a
          href={placeUrl(attraction.name, attraction)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-forest-700 hover:underline"
        >
          Google Maps <ExternalLink size={12} />
        </a>
        {photo?.source_url && (
          <a
            href={photo.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-forest-700 hover:underline"
          >
            Wikipedia <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}

function Stop({
  attraction,
  number,
  city,
  isSelected,
  isVisited,
  onSelect,
  onToggleVisited,
}: {
  attraction: Attraction;
  number: number;
  city: string;
  isSelected: boolean;
  isVisited: boolean;
  onSelect: () => void;
  onToggleVisited: () => void;
}) {
  return (
    <li
      className={`rounded-xl border p-2.5 transition-colors ${
        isSelected ? 'border-teal-500 bg-teal-50/50' : 'border-line bg-white'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={onSelect}
          aria-expanded={isSelected}
          className="flex min-w-0 flex-1 gap-2.5 rounded-lg text-left"
        >
          <span className="relative flex-shrink-0">
            <PlaceImage
              query={attraction.name}
              context={city}
              width={200}
              alt=""
              className="h-16 w-16 rounded-lg"
            />
            <span className="absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-forest-800 text-xs font-bold text-white">
              {number}
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-forest-500">
              {attraction.start_time
                ? `${attraction.start_time}–${attraction.end_time}`
                : 'Flexible'}
            </span>
            <span className={`block font-bold leading-snug ${isVisited ? 'text-ink-mute line-through' : ''}`}>
              {attraction.name}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
              <span>{attraction.category}</span>
              <span className="inline-flex items-center gap-0.5">
                <Clock size={11} /> {attraction.visit_duration_hours} h
              </span>
              {hasRealRating(attraction.rating, attraction.placeholder_metrics) && (
                <span className="inline-flex items-center gap-0.5">
                  <Star size={11} className="fill-ember-500 text-ember-500" />
                  {attraction.rating.toFixed(1)}
                </span>
              )}
              <span>{feeLabel(attraction)}</span>
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleVisited}
          aria-pressed={isVisited}
          aria-label={`Mark ${attraction.name} as ${isVisited ? 'not visited' : 'visited'}`}
          title={isVisited ? 'Visited' : 'Mark as visited'}
          className="icon-btn h-7 w-7 text-ink-mute hover:text-forest-700"
        >
          {isVisited ? <CheckCircle2 size={20} className="text-teal-600" /> : <Circle size={20} />}
        </button>
      </div>

      {isSelected && <StopDetails attraction={attraction} city={city} />}
    </li>
  );
}

function Meal({
  kind,
  meal,
  isSelected,
  onSelect,
}: {
  kind: 'lunch' | 'dinner';
  meal: Restaurant;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const cost = mealCost(meal);
  const lunch = kind === 'lunch';

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
          isSelected ? 'border-teal-500 bg-teal-50/50' : 'border-dashed border-line bg-canvas hover:border-forest-200'
        }`}
      >
        <span
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
            lunch ? 'bg-ember-500 text-ink' : 'bg-ink text-white'
          }`}
        >
          <Utensils size={16} />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-forest-500">
            {lunch ? 'Lunch' : 'Dinner'}
          </span>
          <span className="block truncate text-sm font-bold">
            {meal.restaurant_name || 'Restaurant'}
          </span>
          <span className="block text-xs text-ink-soft">
            {[meal.cuisine?.split(',')[0], meal.area].filter(Boolean).join(' · ')}
            {cost !== null && (
              <>
                {meal.cuisine || meal.area ? ' · ' : ''}
                {meal.cost_is_estimate ? `est. ${inr(cost)}` : inr(cost)}/person
              </>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

/** One day's plan, grouped into morning, afternoon and evening. */
export default function ItineraryCard({
  day,
  city,
  selected,
  visited,
  onSelect,
  onToggleVisited,
}: {
  day: DayItinerary;
  city: string;
  selected: string | null;
  visited: string[];
  onSelect: (key: string | null) => void;
  onToggleVisited: (key: string) => void;
}) {
  const timeline = buildTimeline(day);

  if (timeline.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-canvas p-4 text-sm text-ink-soft">
        <MapPin size={16} /> A free day with nothing scheduled.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {timeline.map(([part, items]) => (
        <section key={part} aria-label={part}>
          <h3 className="eyebrow mb-2">{part}</h3>
          <ul className="space-y-2">
            {items.map(item => {
              if (item.kind === 'stop') {
                const key = stopKey(day.day, item.attraction);
                return (
                  <Stop
                    key={key}
                    attraction={item.attraction}
                    number={item.number}
                    city={city}
                    isSelected={selected === key}
                    isVisited={visited.includes(key)}
                    onSelect={() => onSelect(selected === key ? null : key)}
                    onToggleVisited={() => onToggleVisited(key)}
                  />
                );
              }
              const key = `${day.day}:${item.kind}`;
              return (
                <Meal
                  key={key}
                  kind={item.kind}
                  meal={item.meal}
                  isSelected={selected === key}
                  onSelect={() => onSelect(selected === key ? null : key)}
                />
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
