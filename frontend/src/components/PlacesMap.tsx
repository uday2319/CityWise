import { MapContainer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ExplorePlace } from '../types';
import { hasCoord } from '../lib/format';
import { BaseTiles, FitBounds } from './MapHelpers';

function dot(active: boolean): L.DivIcon {
  const size = active ? 22 : 16;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;
      background:${active ? '#14B8A6' : '#164E3B'};border:3px solid #fff;
      box-shadow:0 2px 6px rgba(15,58,44,.4)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function PlacesMap({
  places,
  selectedId,
  onSelect,
}: {
  places: ExplorePlace[];
  selectedId: string | null;
  onSelect: (place: ExplorePlace) => void;
}) {
  const located = places.filter(hasCoord);
  const coords = located.map((p): [number, number] => [p.latitude, p.longitude]);
  if (coords.length === 0) return null;

  return (
    <MapContainer center={coords[0]} zoom={12} className="h-full w-full">
      <BaseTiles />
      <FitBounds coords={coords} />
      {located.map(place => (
        <Marker
          key={place.id}
          position={[place.latitude, place.longitude]}
          icon={dot(place.id === selectedId)}
          eventHandlers={{ click: () => onSelect(place) }}
          title={place.name}
        >
          <Tooltip direction="top" offset={[0, -8]}>{place.name}</Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
