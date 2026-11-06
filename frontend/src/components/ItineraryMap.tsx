import { useEffect, useRef, type RefObject } from 'react';
import { MapContainer, Marker, Polyline, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, Bike, Car, Footprints, Loader2, Route } from 'lucide-react';
import type { DayItinerary, Hotel, Restaurant, RoadRoute, RouteMode } from '../types';
import {
  feeLabel,
  formatMinutes,
  hasCoord,
  hasRealRating,
  inr,
  mealCost,
  placeUrl,
  ROUTE_MODES,
  stopKey,
  type MealKind,
  type Waypoint,
} from '../lib/format';
import { BaseTiles, FitBounds } from './MapHelpers';
import { PlaceImage } from './ui';

const FOREST = '#164E3B';
const TEAL = '#14B8A6';

const MODE_ICONS = { drive: Car, walk: Footprints, bicycle: Bike };

function badge(text: string, background: string, color: string, radius: string, active: boolean): L.DivIcon {
  const size = active ? 38 : 30;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:${radius};
      background:${active ? TEAL : background};color:${active ? '#0F3935' : color};
      display:flex;align-items:center;justify-content:center;
      font-weight:800;font-size:13px;
      border:3px solid #fff;box-shadow:0 3px 10px rgba(15,58,44,.4);
    ">${text}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function arrowIcon(angle: number): L.DivIcon {
  return L.divIcon({
    className: 'route-arrow',
    html: `<svg width="18" height="18" viewBox="0 0 18 18" style="transform:rotate(${angle}deg)">
      <path d="M9 2 L15 15 L9 11.5 L3 15 Z" fill="#fff" stroke="#164E3B" stroke-width="1.6" stroke-linejoin="round"/>
    </svg>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

const distanceDeg = (a: [number, number], b: [number, number]) =>
  Math.hypot(a[0] - b[0], (a[1] - b[1]) * Math.cos((a[0] * Math.PI) / 180));

/** Evenly spaced points along a line, each with its direction of travel. */
function arrowsAlong(line: [number, number][]): { point: [number, number]; angle: number }[] {
  const lengths = line.slice(1).map((point, index) => distanceDeg(line[index], point));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total < 0.0008) return [];                 // under about 80 m

  const count = Math.min(4, Math.max(1, Math.round(total / 0.01)));
  return Array.from({ length: count }, (_, index) => {
    let remaining = (total * (index + 0.5)) / count;
    let segment = 0;
    while (segment < lengths.length - 1 && remaining > lengths[segment]) {
      remaining -= lengths[segment];
      segment += 1;
    }
    const [from, to] = [line[segment], line[segment + 1]];
    const share = lengths[segment] ? remaining / lengths[segment] : 0;
    return {
      point: [
        from[0] + (to[0] - from[0]) * share,
        from[1] + (to[1] - from[1]) * share,
      ] as [number, number],
      angle:
        (Math.atan2(
          (to[1] - from[1]) * Math.cos((from[0] * Math.PI) / 180),
          to[0] - from[0]
        ) * 180) / Math.PI,
    };
  });
}

function RouteArrows({ line }: { line: [number, number][] }) {
  return (
    <>
      {arrowsAlong(line).map(({ point, angle }) => (
        <Marker
          key={`${point[0]},${point[1]}`}
          position={point}
          icon={arrowIcon(angle)}
          interactive={false}
          keyboard={false}
        />
      ))}
    </>
  );
}

const MEAL_BADGES: Record<MealKind, { letter: string; label: string }> = {
  breakfast: { letter: 'B', label: 'Breakfast' },
  lunch: { letter: 'L', label: 'Lunch' },
  dinner: { letter: 'D', label: 'Dinner' },
};

/** Pans to the selected marker and opens its popup. */
function FocusSelected({
  selected,
  markers,
}: {
  selected: string | null;
  markers: RefObject<Map<string, L.Marker>>;
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
  markerKey,
  selected,
  onSelect,
  register,
}: {
  kind: MealKind;
  meal: Restaurant;
  markerKey: string;
  selected: boolean;
  onSelect: () => void;
  register: (marker: L.Marker | null) => void;
}) {
  const cost = mealCost(meal);
  const { letter, label } = MEAL_BADGES[kind];

  return (
    <Marker
      ref={register}
      position={[Number(meal.latitude), Number(meal.longitude)]}
      icon={badge(letter, '#F28C45', '#1E2925', '9px', selected)}
      zIndexOffset={selected ? 500 : 50}
      eventHandlers={{ click: onSelect }}
    >
      <Tooltip direction="top" offset={[0, -14]}>{label}: {meal.restaurant_name}</Tooltip>
      <Popup key={markerKey}>
        <strong>{meal.restaurant_name}</strong>
        <br />
        {label}{meal.cuisine ? ` · ${meal.cuisine}` : ''}
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

function HotelMarker({
  hotel,
  selected,
  onSelect,
  register,
}: {
  hotel: Hotel;
  selected: boolean;
  onSelect: () => void;
  register: (marker: L.Marker | null) => void;
}) {
  return (
    <Marker
      ref={register}
      position={[Number(hotel.latitude), Number(hotel.longitude)]}
      icon={badge('H', '#1E2925', '#fff', '9px', selected)}
      zIndexOffset={selected ? 500 : 60}
      eventHandlers={{ click: onSelect }}
    >
      <Tooltip direction="top" offset={[0, -14]}>Hotel: {hotel.name}</Tooltip>
      <Popup>
        <strong>{hotel.name}</strong>
        <br />
        Suggested stay{hotel.area ? ` · ${hotel.area}` : ''}
        {hotel.stars ? ` · ${hotel.stars}★` : ''}
        <br />
        <a href={placeUrl(hotel.name, hotel)} target="_blank" rel="noreferrer">
          Open in Google Maps
        </a>
      </Popup>
    </Marker>
  );
}

function RouteLines({
  route,
  failed,
  waypoints,
  selected,
}: {
  route?: RoadRoute;
  failed: boolean;
  waypoints: Waypoint[];
  selected: string | null;
}) {
  if (route) {
    return (
      <>
        {route.legs.filter(leg => leg.routed).map((leg, index) => (
          <Polyline
            key={`${route.mode}-${index}-casing`}
            positions={leg.geometry}
            pathOptions={{ color: '#fff', weight: 8, opacity: 0.85 }}
          />
        ))}
        {route.legs.map((leg, index) => {
          const active = waypoints[index + 1]?.key === selected;
          return (
            <Polyline
              key={`${route.mode}-${index}-${active}`}
              positions={leg.geometry}
              pathOptions={
                leg.routed
                  ? { color: active ? TEAL : FOREST, weight: active ? 6 : 4.5 }
                  : { color: '#6B7873', weight: 2.5, dashArray: '6 8' }
              }
            />
          );
        })}
        {route.legs.map((leg, index) => (
          <RouteArrows key={`${route.mode}-${index}-arrows`} line={leg.geometry} />
        ))}
      </>
    );
  }

  // Never passed off as a road: dashed, and the map shows a notice.
  if (failed) {
    const line = waypoints.map(p => [p.latitude, p.longitude] as [number, number]);
    return (
      <>
        <Polyline positions={line} pathOptions={{ color: '#6B7873', weight: 2, dashArray: '6 8' }} />
        {line.slice(1).map((point, index) => (
          <RouteArrows key={index} line={[line[index], point]} />
        ))}
      </>
    );
  }
  return null;
}

export function EmptyMap({ message }: { message: string }) {
  return (
    <div className="relative h-full">
      <MapContainer center={[22.5, 79]} zoom={5} className="h-full w-full" scrollWheelZoom>
        <BaseTiles />
      </MapContainer>
      <p className="pointer-events-none absolute left-1/2 top-4 z-[900] -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-center text-sm font-semibold shadow-soft">
        {message}
      </p>
    </div>
  );
}

export default function ItineraryMap({
  day,
  city,
  selected,
  mode,
  route,
  routeLoading,
  routeFailed,
  waypoints,
  onSelect,
  onMode,
  onRouteDetails,
}: {
  day: DayItinerary;
  city: string;
  selected: string | null;
  mode: RouteMode;
  route?: RoadRoute;
  routeLoading: boolean;
  routeFailed: boolean;
  waypoints: Waypoint[];
  onSelect: (key: string) => void;
  onMode: (mode: RouteMode) => void;
  onRouteDetails: () => void;
}) {
  const markers = useRef(new Map<string, L.Marker>());

  const register = (key: string) => (marker: L.Marker | null) => {
    if (marker) markers.current.set(key, marker);
    else markers.current.delete(key);
  };

  // Stops without valid coordinates are skipped, never given fallback ones.
  // Numbers come from the visiting order so they match the itinerary.
  const stops = day.attractions
    .map((attraction, index) => ({ attraction, number: index + 1 }))
    .filter(({ attraction }) => hasCoord(attraction));

  const hotel = day.hotel && hasCoord(day.hotel) ? day.hotel : null;
  const hotelKey = `${day.day}:hotel-out`;
  const meals = ([
    ['breakfast', day.breakfast],
    ['lunch', day.lunch],
    ['dinner', day.dinner],
  ] as [MealKind, Restaurant | null | undefined][])
    .flatMap(([kind, meal]) => (meal && hasCoord(meal) ? [{ kind, meal }] : []));

  const points = waypoints.map(p => [p.latitude, p.longitude] as [number, number]);

  if (points.length === 0) {
    return <EmptyMap message="No map locations are available for this day." />;
  }

  return (
    <div className="relative h-full">
      <MapContainer center={points[0]} zoom={13} className="h-full w-full">
        <BaseTiles />
        <FitBounds coords={points} />
        <FocusSelected selected={selected} markers={markers} />
        <RouteLines route={route} failed={routeFailed} waypoints={waypoints} selected={selected} />

        {stops.map(({ attraction, number }) => {
          const key = stopKey(day.day, attraction);
          const active = selected === key;
          return (
            <Marker
              key={key}
              ref={register(key)}
              position={[Number(attraction.latitude), Number(attraction.longitude)]}
              icon={badge(String(number), FOREST, '#fff', '50%', active)}
              zIndexOffset={active ? 500 : 100}
              eventHandlers={{ click: () => onSelect(key) }}
            >
              <Tooltip direction="top" offset={[0, -14]}>{number}. {attraction.name}</Tooltip>
              <Popup minWidth={210}>
                <PlaceImage
                  query={attraction.name}
                  context={city}
                  width={320}
                  alt={attraction.name}
                  className="mb-2 h-24 w-full rounded-lg"
                />
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

        {meals.map(({ kind, meal }) => {
          const key = `${day.day}:${kind}`;
          return (
            <MealMarker
              key={key}
              kind={kind}
              meal={meal}
              markerKey={key}
              selected={selected === key}
              onSelect={() => onSelect(key)}
              register={register(key)}
            />
          );
        })}

        {hotel && (
          <HotelMarker
            key={hotelKey}
            hotel={hotel}
            selected={selected === hotelKey}
            onSelect={() => onSelect(hotelKey)}
            register={register(hotelKey)}
          />
        )}
      </MapContainer>

      <div className="pointer-events-none absolute inset-x-3 top-3 z-[900] flex flex-wrap items-start justify-end gap-2 pl-12">
        <div role="group" aria-label="Travel mode" className="pointer-events-auto flex rounded-full bg-white p-1 shadow-soft">
          {ROUTE_MODES.map(({ key, label }) => {
            const Icon = MODE_ICONS[key];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={mode === key}
                onClick={() => onMode(key)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mode === key ? 'bg-forest-800 text-white' : 'text-ink-soft hover:bg-forest-50'
                }`}
              >
                <Icon size={14} /> <span className="hidden min-[1400px]:inline">{label}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onRouteDetails}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-forest-800 shadow-soft hover:bg-forest-50"
        >
          <Route size={14} /> Route details
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-7 left-1/2 z-[900] -translate-x-1/2 whitespace-nowrap text-sm" aria-live="polite">
        {routeLoading && (
          <span className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2 font-semibold shadow-soft">
            <Loader2 size={15} className="animate-spin" /> Finding road route
          </span>
        )}
        {route && (
          <span className="rounded-full bg-forest-800 px-3.5 py-2 font-bold text-white shadow-soft">
            {formatMinutes(route.duration_min)} · {route.distance_km.toFixed(1)} km
          </span>
        )}
      </div>

      {routeFailed && (
        <p
          role="alert"
          className="absolute inset-x-3 bottom-7 z-[900] mx-auto flex max-w-md items-start gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-medium shadow-lift"
        >
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-ember-700" />
          Road route unavailable. Dashed lines only show the order of stops, not roads.
        </p>
      )}

      <ul aria-label="Map legend" className="pointer-events-none absolute bottom-7 left-3 z-[900] hidden space-y-1 rounded-xl bg-white/95 px-2.5 py-2 text-xs font-medium shadow-soft sm:block">
        <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-forest-800" /> Attraction</li>
        <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-ember-500" /> Restaurant</li>
        <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-ink" /> Hotel</li>
      </ul>
    </div>
  );
}
