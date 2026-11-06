import { useEffect, useRef } from 'react';
import { TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

export function BaseTiles() {
  return (
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    />
  );
}

/**
 * Fits the map to its points whenever they change. Also handles a map that
 * starts hidden (the mobile tabs), which has no size until it is shown.
 */
export function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  const fittedKey = useRef('');
  const key = coords.map(c => c.join(',')).join('|');

  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      if (coords.length === 0 || map.getSize().x === 0) return;
      if (fittedKey.current === key) return;
      fittedKey.current = key;
      map.fitBounds(L.latLngBounds(coords), { padding: [48, 48], maxZoom: 15 });
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(map.getContainer());
    return () => observer.disconnect();
    // `key` is the value identity of `coords`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);

  return null;
}
