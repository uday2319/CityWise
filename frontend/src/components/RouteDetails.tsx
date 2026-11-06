import { ExternalLink } from 'lucide-react';
import type { RoadRoute } from '../types';
import { directionsUrl, formatMinutes, ROUTE_MODES, type Waypoint } from '../lib/format';

export default function RouteDetails({
  waypoints,
  route,
  failed,
}: {
  waypoints: Waypoint[];
  route?: RoadRoute;
  failed: boolean;
}) {
  if (waypoints.length < 2) {
    return <p className="text-sm text-ink-soft">This day has no route between places.</p>;
  }

  const modeLabel = ROUTE_MODES.find(m => m.key === route?.mode)?.label.toLowerCase();

  return (
    <div className="space-y-4">
      {failed && (
        <p className="text-sm font-medium text-ember-700">
          Road routing is unavailable right now, so distances and times can’t be shown.
          Google Maps can still give directions.
        </p>
      )}

      {route && (
        <>
          <p className="text-sm font-semibold">
            {route.distance_km.toFixed(1)} km · {formatMinutes(route.duration_min)} {modeLabel}
          </p>
          <ol className="space-y-2">
            {route.legs.map((leg, index) => (
              <li key={`${waypoints[index].key}-${index}`} className="rounded-xl bg-canvas p-3 text-sm">
                <p className="font-semibold">
                  {waypoints[index].name} to {waypoints[index + 1]?.name}
                </p>
                <p className="text-ink-soft">
                  {leg.duration_min === null
                    ? 'No road route to this stop. It may be on water or inside a park.'
                    : `${leg.distance_km.toFixed(1)} km · ${formatMinutes(leg.duration_min)}`}
                </p>
              </li>
            ))}
          </ol>
          <p className="text-xs text-ink-soft">
            Attractions are ordered to reduce travel. Times come from road data and
            don’t include live traffic.
          </p>
        </>
      )}

      <a href={directionsUrl(waypoints)} target="_blank" rel="noreferrer" className="btn-primary w-full">
        Get directions in Google Maps <ExternalLink size={15} />
      </a>
    </div>
  );
}
