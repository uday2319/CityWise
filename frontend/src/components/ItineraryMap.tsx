import { useEffect, useRef } from 'react';
import { MapContainer, Marker, Polyline, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPinOff } from 'lucide-react';
import type { DayItinerary, Restaurant } from '../types';
import {
  feeLabel,
  hasCoord,
  hasRealRating,
  inr,
  mealCost,
  placeUrl,
  stopKey,
} from '../lib/format';
import { BaseTiles, FitBounds } from './MapHelpers';

const ROUTE_COLOR = '#164E3B';

function stopIcon(number: number, active: boolean): L.DivIcon {
  const size = active ? 38 : 30;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${active ? '#14B8A6' : ROUTE_COLOR};color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:${active ? 15 : 13}px;
      border:3px solid #fff;box-shadow:0 3px 10px rgba(15,58,44,.4);
    ">${number}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function mealIcon(kind: 'lunch' | 'dinner', active: boolean): L.DivIcon {
  const size = active ? 34 : 28;
  const lunch = kind === 'lunch';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9px;
      background:${lunch ? '#F28C45' : '#1E2925'};color:${lunch ? '#1E2925' : '#fff'};
      display:flex;align-items:center;justify-content:center;
      font-weight:800;font-size:12px;
      border:2px solid #fff;box-shadow:0 3px 10px rgba(15,58,44,.4);
    ">${lunch ? 'L' : 'D'}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

/** Pans to the selected marker and opens its popup. */
function FocusSelected({
  selected,
  markers,
}: {
  selected: string | null;
  markers: React.RefObject<Map<string, L.Marker>>;
}) {
  const map = useMap();

  useEffect(() => {
    const marker = selected ? markers.current.get(selected) : undefined;
    if (!marker) return;
    map.panTo(marker.getLatLng());
    marker.openPopup();
  }, [selected, markers, map]);

  return null;
}

function MealMarker({
  kind,
  meal,
  dayNumber,
  selected,
  onSelect,
  register,
}: {
  kind: 'lunch' | 'dinner';
  meal: Restaurant;
  dayNumber: number;
  selected: string | null;
  onSelect: (key: string) => void;
  register: (key: string, marker: L.Marker | null) => void;
}) {
  const key = `${dayNumber}:${kind}`;
  const cost = mealCost(meal);
  const label = kind === 'lunch' ? 'Lunch' : 'Dinner';

  return (
    <Marker
      ref={marker => register(key, marker)}
      position={[Number(meal.latitude), Number(meal.longitude)]}
      icon={mealIcon(kind, selected === key)}
      eventHandlers={{ click: () => onSelect(key) }}
    >
      <Tooltip direction="top" offset={[0, -14]}>
        {label}: {meal.restaurant_name}
      </Tooltip>
      <Popup>
        <strong>{meal.restaurant_name}</strong>
        <br />
        {label}
        {meal.cuisine ? ` · ${meal.cuisine}` : ''}
        {cost !== null && (
          <>
            <br />
            {meal.cost_is_estimate ? `About ${inr(cost)}` : inr(cost)} per person
          </>
        )}
        <br />
        <a href={placeUrl(meal.restaurant_name ?? '', meal)} target="_blank" rel="noreferrer">
          Open in Google Maps
        </a>
      </Popup>
    </Marker>
  );
}

export default function ItineraryMap({
  day,
  selected,
  onSelect,
}: {
  day: DayItinerary;
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const markers = useRef(new Map<string, L.Marker>());

  const register = (key: string, marker: L.Marker | null) => {
    if (marker) markers.current.set(key, marker);
    else markers.current.delete(key);
  };

  // Stops without valid coordinates are skipped, never given fallback ones.
  // Numbers still come from the visiting order so they match the itinerary.
  const stops = day.attractions
    .map((attraction, index) => ({ attraction, number: index + 1 }))
    .filter(({ attraction }) => hasCoord(attraction));

  const route = stops.map(({ attraction }): [number, number] => [
    Number(attraction.latitude),
    Number(attraction.longitude),
  ]);

  const lunch = day.lunch && hasCoord(day.lunch) ? day.lunch : null;
  const dinner = day.dinner && hasCoord(day.dinner) ? day.dinner : null;

  const allPoints = [
    ...route,
    ...[lunch, dinner].flatMap((meal): [number, number][] =>
      meal ? [[Number(meal.latitude), Number(meal.longitude)]] : []
    ),
  ];

  if (allPoints.length === 0) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-2 bg-forest-50 text-sm text-ink-soft">
        <MapPinOff size={24} />
        No map locations are available for this day.
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[420px]">
      <MapContainer
        center={allPoints[0]}
        zoom={13}
        className="h-full w-full"
        style={{ minHeight: 420 }}
      >
        <BaseTiles />
        <FitBounds coords={allPoints} />
        <FocusSelected selected={selected} markers={markers} />

        {route.length > 1 && (
          <Polyline
            positions={route}
            pathOptions={{ color: ROUTE_COLOR, weight: 4, opacity: 0.85 }}
          />
        )}

        {stops.map(({ attraction, number }) => {
          const key = stopKey(day.day, attraction);
          return (
            <Marker
              key={key}
              ref={marker => register(key, marker)}
              position={[Number(attraction.latitude), Number(attraction.longitude)]}
              icon={stopIcon(number, selected === key)}
              zIndexOffset={selected === key ? 500 : 100}
              eventHandlers={{ click: () => onSelect(key) }}
            >
              <Tooltip direction="top" offset={[0, -14]}>
                {number}. {attraction.name}
              </Tooltip>
              <Popup>
                <strong>{attraction.name}</strong>
                <br />
                {attraction.category}
                {attraction.start_time && ` · ${attraction.start_time}–${attraction.end_time}`}
                <br />
                {attraction.visit_duration_hours} h · {feeLabel(attraction)}
                {hasRealRating(attraction.rating, attraction.placeholder_metrics) &&
                  ` · ★ ${attraction.rating.toFixed(1)}`}
                <br />
                <a href={placeUrl(attraction.name, attraction)} target="_blank" rel="noreferrer">
                  Open in Google Maps
                </a>
              </Popup>
            </Marker>
          );
        })}

        {lunch && (
          <MealMarker
            key={`${day.day}-lunch`}
            kind="lunch"
            meal={lunch}
            dayNumber={day.day}
            selected={selected}
            onSelect={onSelect}
            register={register}
          />
        )}
        {dinner && (
          <MealMarker
            key={`${day.day}-dinner`}
            kind="dinner"
            meal={dinner}
            dayNumber={day.day}
            selected={selected}
            onSelect={onSelect}
            register={register}
          />
        )}
      </MapContainer>

      <ul
        aria-label="Map legend"
        className="pointer-events-none absolute bottom-6 left-3 z-[900] space-y-1 rounded-xl bg-white/95 px-3 py-2 text-xs font-medium text-ink shadow-soft"
      >
        <li className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-forest-800" /> Attraction
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-ember-500" /> Lunch
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-ink" /> Dinner
        </li>
      </ul>
    </div>
  );
}
