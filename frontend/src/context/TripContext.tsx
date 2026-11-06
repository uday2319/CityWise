/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiErrorMessage, itineraApi } from '../api/itineraApi';
import { readStored, STORAGE_KEYS, writeStored } from '../lib/storage';
import type { ItineraryRequest, Trip } from '../types';

interface GenerateInput {
  request: ItineraryRequest;
  travellers: number;
}

interface TripContextValue {
  current: Trip | null;
  savedTrips: Trip[];
  generating: boolean;
  generate: (input: GenerateInput) => Promise<Trip | null>;
  findTrip: (id: string) => Trip | null;
  showTrip: (trip: Trip) => void;
  saveTrip: (trip: Trip) => void;
  updateTrip: (id: string, changes: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;
  clearAll: () => void;
}

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Trip | null>(() =>
    readStored<Trip | null>(STORAGE_KEYS.currentTrip, null)
  );
  const [savedTrips, setSavedTrips] = useState<Trip[]>(() =>
    readStored<Trip[]>(STORAGE_KEYS.savedTrips, [])
  );

  const storeCurrent = useCallback((trip: Trip | null) => {
    setCurrent(trip);
    writeStored(STORAGE_KEYS.currentTrip, trip);
  }, []);

  const storeSaved = useCallback((trips: Trip[]) => {
    setSavedTrips(trips);
    return writeStored(STORAGE_KEYS.savedTrips, trips);
  }, []);

  const mutation = useMutation({
    mutationFn: ({ request }: GenerateInput) =>
      itineraApi.generateItinerary(request),
  });

  const generate = useCallback(
    async ({ request, travellers }: GenerateInput) => {
      try {
        const itinerary = await mutation.mutateAsync({ request, travellers });
        const trip: Trip = {
          id: itinerary.session_id,
          name: `${itinerary.duration_days} ${
            itinerary.duration_days === 1 ? 'day' : 'days'
          } in ${itinerary.city}`,
          request,
          itinerary,
          travellers,
          saved: false,
          visited: [],
        };
        storeCurrent(trip);
        return trip;
      } catch (error) {
        toast.error(apiErrorMessage(error, 'Could not generate the itinerary.'));
        return null;
      }
    },
    [mutation, storeCurrent]
  );

  const findTrip = useCallback(
    (id: string) =>
      savedTrips.find(trip => trip.id === id) ??
      (current?.id === id ? current : null),
    [savedTrips, current]
  );

  const saveTrip = useCallback(
    (trip: Trip) => {
      const stored: Trip = { ...trip, saved: true };
      const ok = storeSaved([
        stored,
        ...savedTrips.filter(item => item.id !== trip.id),
      ]);
      if (current?.id === trip.id) storeCurrent(stored);
      if (ok) toast.success('Trip saved to My Trips');
      else toast.error('This browser could not store the trip.');
    },
    [current, savedTrips, storeCurrent, storeSaved]
  );

  const updateTrip = useCallback(
    (id: string, changes: Partial<Trip>) => {
      if (savedTrips.some(trip => trip.id === id)) {
        storeSaved(
          savedTrips.map(trip => (trip.id === id ? { ...trip, ...changes } : trip))
        );
      }
      if (current?.id === id) storeCurrent({ ...current, ...changes });
    },
    [current, savedTrips, storeCurrent, storeSaved]
  );

  const deleteTrip = useCallback(
    (id: string) => {
      storeSaved(savedTrips.filter(trip => trip.id !== id));
      if (current?.id === id) storeCurrent({ ...current, saved: false });
      toast.success('Trip deleted');
    },
    [current, savedTrips, storeCurrent, storeSaved]
  );

  const clearAll = useCallback(() => {
    storeSaved([]);
    storeCurrent(null);
  }, [storeCurrent, storeSaved]);

  const value = useMemo(
    () => ({
      current,
      savedTrips,
      generating: mutation.isPending,
      generate,
      findTrip,
      showTrip: storeCurrent,
      saveTrip,
      updateTrip,
      deleteTrip,
      clearAll,
    }),
    [
      current, savedTrips, mutation.isPending, generate, findTrip,
      storeCurrent, saveTrip, updateTrip, deleteTrip, clearAll,
    ]
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrips(): TripContextValue {
  const context = useContext(TripContext);
  if (!context) throw new Error('useTrips must be used inside TripProvider');
  return context;
}
