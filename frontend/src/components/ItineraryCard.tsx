import type { ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BedDouble,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Plus,
  Star,
  Trash2,
  Utensils,
} from 'lucide-react';
import type { Attraction, DayItinerary, Hotel, Restaurant, RouteLeg } from '../types';
import { dishForCuisine } from '../lib/catalog';
import {
  buildTimeline,
  feeLabel,
  formatMinutes,
  hasRealRating,
  inr,
  mealCost,
  placeUrl,
  type MealKind,
} from '../lib/format';
import { PlaceImage, usePhoto } from './ui';

const MEAL_LABELS: Record<MealKind, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

function Row({
  time,
  selected,
  children,
}: {
  time: string;
  selected: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <span className="w-10 flex-shrink-0 pt-3 text-xs font-bold text-forest-500">{time}</span>
      <div className={`min-w-0 flex-1 rounded-xl border p-2 transition-colors ${
        selected ? 'border-teal-500 bg-teal-50/60' : 'border-line bg-white'
      }`}>
        {children}
      </div>
    </div>
  );
}

function Connector({ leg }: { leg?: RouteLeg }) {
  if (!leg) return <div className="h-1.5" />;
  return (
    <p className="my-0.5 ml-[3.25rem] border-l-2 border-dotted border-forest-200 py-0.5 pl-3 text-xs text-ink-mute">
      {leg.duration_min === null
        ? 'No road route'
        : `${formatMinutes(leg.duration_min)} · ${leg.distance_km.toFixed(1)} km`}
    </p>
  );
}

function StopDetails({ attraction, city }: { attraction: Attraction; city: string }) {
  const { data: photo } = usePhoto(attraction.name, city);

  return (
    <div className="mt-2 space-y-1.5 text-sm text-ink-soft">
      {photo?.description && <p>{photo.description}</p>}
      {attraction.opening_hours && (
        <p><span className="font-semibold">Hours:</span> {attraction.opening_hours}</p>
      )}
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
            Photo source <ExternalLink size={12} />
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
  isFirst,
  isLast,
  onSelect,
  onToggleVisited,
  onMove,
  onRemove,
}: {
  attraction: Attraction;
  number: number;
  city: string;
  isSelected: boolean;
  isVisited: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onToggleVisited: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <div className="flex items-start gap-2">
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
              className="h-14 w-14 rounded-lg"
            />
            <span className="absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-forest-800 text-xs font-bold text-white">
              {number}
            </span>
          </span>
          <span className="min-w-0">
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
          {isVisited ? <CheckCircle2 size={19} className="text-teal-600" /> : <Circle size={19} />}
        </button>
      </div>

      {isSelected && (
        <>
          <StopDetails attraction={attraction} city={city} />
          <div className="mt-2 flex flex-wrap items-center gap-x-1 border-t border-line pt-2">
            <button
              type="button"
              disabled={isFirst}
              onClick={() => onMove(-1)}
              aria-label={`Move ${attraction.name} earlier`}
              className="btn-ghost px-2 py-1 text-xs"
            >
              <ArrowUp size={14} /> Earlier
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={() => onMove(1)}
              aria-label={`Move ${attraction.name} later`}
              className="btn-ghost px-2 py-1 text-xs"
            >
              <ArrowDown size={14} /> Later
            </button>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${attraction.name}`}
              className="btn-ghost ml-auto px-2 py-1 text-xs text-red-700 hover:bg-red-50 hover:text-red-800"
            >
              <Trash2 size={14} /> Remove
            </button>
          </div>
        </>
      )}
    </>
  );
}

function Meal({
  kind,
  meal,
  onSelect,
}: {
  kind: MealKind;
  meal: Restaurant;
  onSelect: () => void;
}) {
  const cost = mealCost(meal);
  const details = [meal.cuisine?.split(',')[0], meal.area].filter(Boolean).join(' · ');

  return (
    <button type="button" onClick={onSelect} className="flex w-full items-center gap-2.5 rounded-lg text-left">
      <PlaceImage
        query={dishForCuisine(meal.cuisine)}
        width={200}
        alt=""
        icon={Utensils}
        className="h-12 w-12 flex-shrink-0 rounded-lg"
      />
      <span className="min-w-0">
        <span className="block text-xs font-bold text-ember-700">{MEAL_LABELS[kind]}</span>
        <span className="block truncate text-sm font-bold">{meal.restaurant_name || 'Restaurant'}</span>
        <span className="block truncate text-xs text-ink-soft">
          {details}
          {cost !== null && `${details ? ' · ' : ''}${meal.cost_is_estimate ? 'est. ' : ''}${inr(cost)}/person`}
        </span>
      </span>
    </button>
  );
}

function HotelStop({
  hotel,
  leaving,
  city,
  onSelect,
}: {
  hotel: Hotel;
  leaving: boolean;
  city: string;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className="flex w-full items-center gap-2.5 rounded-lg text-left">
      <PlaceImage
        query={hotel.name}
        context={city}
        width={200}
        alt=""
        icon={BedDouble}
        className="h-12 w-12 flex-shrink-0 rounded-lg"
      />
      <span className="min-w-0">
        <span className="block text-xs font-bold text-teal-700">
          {leaving ? 'Leave hotel' : 'Back to hotel'}
        </span>
        <span className="block truncate text-sm font-bold">{hotel.name}</span>
        <span className="block truncate text-xs text-ink-soft">
          {hotel.stars ? `${'★'.repeat(hotel.stars)} ` : ''}{hotel.area}
        </span>
      </span>
    </button>
  );
}

/** One day from leaving the hotel to returning, in time order. */
export default function ItineraryCard({
  day,
  city,
  selected,
  visited,
  legs,
  onSelect,
  onToggleVisited,
  onMove,
  onRemove,
  onAdd,
}: {
  day: DayItinerary;
  city: string;
  selected: string | null;
  visited: string[];
  legs: Map<string, RouteLeg>;
  onSelect: (key: string | null) => void;
  onToggleVisited: (key: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}) {
  const hotelKey = `${day.day}:hotel-out`;
  const pick = (key: string) => onSelect(selected === key ? null : key);

  return (
    <div className="space-y-3">
      {buildTimeline(day).map(([part, items]) => (
        <section key={part} aria-label={part}>
          <h3 className="eyebrow mb-1.5">{part}</h3>
          <ul>
            {items.map(item => {
              const isHotel = item.kind === 'hotel';
              const key = isHotel ? hotelKey : item.key;
              return (
                <li key={item.key}>
                  <Row
                    time={item.kind === 'stop' && item.flexible ? 'Any' : item.time}
                    selected={selected === key}
                  >
                    {item.kind === 'stop' && (
                      <Stop
                        attraction={item.attraction}
                        number={item.number}
                        city={city}
                        isSelected={selected === key}
                        isVisited={visited.includes(key)}
                        isFirst={item.index === 0}
                        isLast={item.index === day.attractions.length - 1}
                        onSelect={() => pick(key)}
                        onToggleVisited={() => onToggleVisited(key)}
                        onMove={direction => onMove(item.index, direction)}
                        onRemove={() => onRemove(item.index)}
                      />
                    )}
                    {item.kind === 'hotel' && (
                      <HotelStop
                        hotel={item.hotel}
                        leaving={item.leaving}
                        city={city}
                        onSelect={() => pick(key)}
                      />
                    )}
                    {(item.kind === 'breakfast' || item.kind === 'lunch' || item.kind === 'dinner') && (
                      <Meal kind={item.kind} meal={item.meal} onSelect={() => pick(key)} />
                    )}
                  </Row>
                  <Connector leg={legs.get(item.key)} />
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <button type="button" onClick={onAdd} className="btn-secondary w-full">
        <Plus size={16} /> Add a place to Day {day.day}
      </button>

      {(day.breakfast || day.lunch || day.dinner) && (
        <p className="text-xs text-ink-mute">
          Food photos show a typical dish, not the restaurant itself.
        </p>
      )}
    </div>
  );
}
