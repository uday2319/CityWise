import { ExternalLink } from 'lucide-react';
import type { DayItinerary } from '../types';
import {
  directionsUrl,
  estimateTravelMinutes,
  formatMinutes,
  hasCoord,
  haversineKm,
} from '../lib/format';

export default function RouteDetails({ day }: { day: DayItinerary }) {
  const stops = day.attractions.filter(hasCoord);

  if (stops.length < 2) {
    return <p className="text-sm text-ink-soft">This day has no route between stops.</p>;
  }

  const legs = stops.slice(1).map((stop, index) => {
    const km = haversineKm(stops[index], stop);
    return { from: stops[index].name, to: stop.name, km };
  });

  return (
    <div className="space-y-4">
      <ol className="space-y-2">
        {legs.map((leg, index) => (
          <li key={`${leg.from}-${leg.to}`} className="rounded-xl bg-canvas p-3 text-sm">
            <p className="font-semibold">
              {index + 1}. {leg.from} to {leg.to}
            </p>
            <p className="text-ink-soft">
              {leg.km.toFixed(1)} km · ~{formatMinutes(estimateTravelMinutes(leg.km))}
            </p>
          </li>
        ))}
      </ol>

      <p className="text-xs text-ink-soft">
        The visiting order is optimised for distance. Distances are straight lines and
        times are rough estimates, so actual roads and traffic will differ.
      </p>

      <a href={directionsUrl(stops)} target="_blank" rel="noreferrer" className="btn-primary w-full">
        Get directions in Google Maps <ExternalLink size={15} />
      </a>
    </div>
  );
}
