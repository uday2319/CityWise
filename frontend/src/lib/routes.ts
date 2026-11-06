import { useQueries, useQuery } from '@tanstack/react-query';
import { itineraApi } from '../api/itineraApi';
import type { DayItinerary, RouteMode } from '../types';
import { dayWaypoints, type Waypoint } from './format';

const routeQuery = (waypoints: Waypoint[], mode: RouteMode) => ({
  queryKey: [
    'road-route',
    mode,
    waypoints.map(p => `${p.latitude},${p.longitude}`).join('|'),
  ],
  queryFn: () =>
    itineraApi.getRoadRoute(
      waypoints.map(({ latitude, longitude }) => ({ latitude, longitude })),
      mode
    ),
  enabled: waypoints.length >= 2,
  staleTime: Infinity,
  retry: 1,
});

/** The road route through one day, in visiting order. */
export function useDayRoute(day: DayItinerary | undefined, mode: RouteMode) {
  const waypoints = day ? dayWaypoints(day) : [];
  return { waypoints, ...useQuery(routeQuery(waypoints, mode)) };
}

/** Road distance and time across the whole trip. */
export function useTripRouteTotals(days: DayItinerary[], mode: RouteMode) {
  const results = useQueries({
    queries: days.map(day => routeQuery(dayWaypoints(day), mode)),
  });
  const loaded = results.flatMap(result => (result.data ? [result.data] : []));
  return {
    complete: loaded.length === days.filter(d => dayWaypoints(d).length >= 2).length,
    distanceKm: loaded.reduce((sum, route) => sum + route.distance_km, 0),
    durationMin: loaded.reduce((sum, route) => sum + route.duration_min, 0),
  };
}
