import axios from 'axios';
import type {
  ItineraryRequest,
  ItineraryResponse,
  BudgetSummary,
} from '../types';

const API_BASE = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,   // 60s — allows ML pipeline to complete
});

export const itineraApi = {
  generateItinerary: async (
    request: ItineraryRequest
  ): Promise<ItineraryResponse> => {
    const { data } = await api.post<ItineraryResponse>(
      '/itinerary/generate',
      request
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
    const { data } = await api.get<{ cities: string[] }>(
      `/cities/search?q=${encodeURIComponent(q)}`
    );
    return data.cities;
  },

  getPopularCities: async () => {
    const { data } = await api.get('/cities/popular');
    return data.cities;
  },
};