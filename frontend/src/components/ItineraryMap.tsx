// frontend/src/components/ItineraryMap.tsx
// CHANGES:
//   1. Removed the Bangalore fallback coordinate assignment inside forEach.
//      Attractions without valid coords are now skipped entirely.
//   2. Added a guard so the map never renders with zero markers
//      (shows a placeholder message instead).
//   All other logic is identical to your current file.

import React, { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { DayItinerary, Attraction } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const COLORS = {
  routes: ['#f97316', '#14b8a6', '#8b5cf6'],
};

function isValidCoord(lat: unknown, lng: unknown): boolean {
  const la = Number(lat);
  const lo = Number(lng);
  return (
    isFinite(la) && isFinite(lo)
    && la !== 0 && lo !== 0
    && la >= -90 && la <= 90
    && lo >= -180 && lo <= 180
  );
}

function createPin(number: number, color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};color:white;width:28px;height:28px;
      border-radius:50%;display:flex;align-items:center;
      justify-content:center;font-weight:bold;border:2px solid white;
    ">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

function MapBounds({ coords }: { coords: [number, number][] }) {
  const map  = useMap();
  const prev = useRef('');
  useEffect(() => {
    if (coords.length === 0) return;
    const key = coords.map(c => c.join(',')).join('|');
    if (key === prev.current) return;
    prev.current = key;
    map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 15 });
  }, [coords, map]);
  return null;
}

export default function ItineraryMap({
  days,
  activeDay,
}: {
  days: DayItinerary[];
  activeDay: number;
}) {
  const day        = days[activeDay - 1];
  const routeColor = COLORS.routes[(activeDay - 1) % COLORS.routes.length];

  // ── Build validated entries — NO fallback coordinates ─────────────────
  // If an attraction has invalid or missing coordinates it is skipped.
  // The Geoapify pipeline guarantees coordinates are valid before they
  // reach here, so this is purely a defensive guard.
  const validEntries: {
    attraction: Attraction;
    coord: [number, number];
    originalIndex: number;
  }[] = [];

  if (day) {
    day.attractions.forEach((attraction, idx) => {
      if (!isValidCoord(attraction.latitude, attraction.longitude)) {
        // ── CHANGE: skip instead of substituting Bangalore coords ──────
        console.warn(
          `[ItineraryMap] Skipping "${attraction.name}" — invalid coordinates`,
          { lat: attraction.latitude, lng: attraction.longitude }
        );
        return;
      }
      validEntries.push({
        attraction,
        coord: [Number(attraction.latitude), Number(attraction.longitude)],
        originalIndex: idx + 1,
      });
    });
  }

  const coords = validEntries.map(e => e.coord);

  // ── Guard: show a message when the day has no plottable attractions ───
  if (coords.length === 0) {
    return (
      <div
        style={{
          height: '500px',
          borderRadius: '16px',
          background: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: '14px',
        }}
      >
        No map data available for this day.
      </div>
    );
  }

  // First valid coord is the map centre — fitBounds will adjust zoom anyway.
  const center: [number, number] = coords[0];

  return (
    <div style={{ height: '500px', borderRadius: '16px', overflow: 'hidden' }}>
      <MapContainer
        key={activeDay}
        center={center}
        zoom={13}
        style={{ height: '100%' }}
      >
        <TileLayer
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
/>
          

        <MapBounds coords={coords} />

        {coords.length > 1 && (
          <Polyline
            positions={coords}
            pathOptions={{ color: routeColor, weight: 4 }}
          />
        )}

        {validEntries.map(entry => (
          <Marker
            key={entry.originalIndex}
            position={entry.coord}
            icon={createPin(entry.originalIndex, routeColor)}
          >
            <Tooltip direction="top" offset={[0, -16]}>
              {entry.attraction.name}
            </Tooltip>
            <Popup>
              <strong>{entry.attraction.name}</strong>
              <br />
              {entry.attraction.category}
              <br />
              ⭐ {entry.attraction.rating}
            </Popup>
          </Marker>
        ))}

        {day?.lunch && isValidCoord(day.lunch.latitude, day.lunch.longitude) && (
          <Marker
            position={[day.lunch.latitude!, day.lunch.longitude!]}
          >
            <Popup>🍽 Lunch: {day.lunch.restaurant_name}</Popup>
          </Marker>
        )}

        {day?.dinner && isValidCoord(day.dinner.latitude, day.dinner.longitude) && (
          <Marker
            position={[day.dinner.latitude!, day.dinner.longitude!]}
          >
            <Popup>🌙 Dinner: {day.dinner.restaurant_name}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}