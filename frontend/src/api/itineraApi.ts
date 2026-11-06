import axios from 'axios';
import type {
  BudgetSummary,
  ExplorePlace,
  ItineraryRequest,
  ItineraryResponse,
  PlacePhoto,
  RoadRoute,
  RouteMode,
  TranslationResult,
  Weather,
} from '../types';

const API_BASE =
  import.meta.env.VITE_API_BASE ?? 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Route optimisation takes several seconds per day, so long trips need longer.
const GENERATE_TIMEOUT_MS = 180000;

/** A message that is safe and useful to show for any failed request. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  if (error.code === 'ECONNABORTED') {
    return 'The request took too long. Please try again.';
  }
  if (!error.response) {
    return 'Could not reach the CityWise server. Is the backend running?';
  }
  const detail = error.response.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') {
    return detail[0].msg;
  }
  return fallback;
}

export const itineraApi = {
  generateItinerary: async (
    request: ItineraryRequest
  ): Promise<ItineraryResponse> => {
    const { data } = await api.post<ItineraryResponse>(
      '/itinerary/generate',
      request,
      { timeout: GENERATE_TIMEOUT_MS }
    );
    return data;
  },

  getBudgetSummary: async (sessionId: string): Promise<BudgetSummary> => {
    const { data } = await api.get<BudgetSummary>(
      `/itinerary/budget-summary/${sessionId}`
    );
    return data;
  },

  searchCities: async (q: string): Promise<string[]> => {
    const { data } = await api.get<{ cities: string[] }>('/cities/search', {
      params: { q },
    });
    return data.cities;
  },

  getPopularCities: async () => {
    const { data } = await api.get('/cities/popular');
    return data.cities;
  },

  explorePlaces: async (
    city: string,
    interest?: string
  ): Promise<ExplorePlace[]> => {
    const { data } = await api.get<{ places: ExplorePlace[] }>(
      '/attractions/explore',
      { params: { city, interest: interest || undefined } }
    );
    return data.places;
  },

  getPhoto: async (
    query: string,
    context?: string,
    width = 800
  ): Promise<PlacePhoto> => {
    const { data } = await api.get<PlacePhoto>('/media/photo', {
      params: { query, context: context || undefined, width },
    });
    return data;
  },

  getWeather: async (lat: number, lon: number): Promise<Weather> => {
    const { data } = await api.get<Weather>('/weather/current', {
      params: { lat, lon },
    });
    return data;
  },

  getRoadRoute: async (
    waypoints: { latitude: number; longitude: number }[],
    mode: RouteMode
  ): Promise<RoadRoute> => {
    const { data } = await api.post<RoadRoute>('/routing/route', { waypoints, mode });
    return data;
  },

  getTranslationProvider: async (): Promise<string> => {
    const { data } = await api.get<{ provider: string }>('/translate/languages');
    return data.provider;
  },

  translate: async (
    text: string,
    source: string,
    target: string
  ): Promise<TranslationResult> => {
    const { data } = await api.post<TranslationResult>('/translate', {
      text,
      source,
      target,
    });
    return data;
  },
};
