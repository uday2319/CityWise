/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { readStored, STORAGE_KEYS, writeStored } from '../lib/storage';
import type { ExplorePlace, Profile } from '../types';

export const EMPTY_PROFILE: Profile = {
  name: '',
  homeCity: '',
  travelStyle: '',
  sourceLanguage: 'en',
  targetLanguage: 'hi',
  savedDestinations: [],
  savedPlaces: [],
};

interface ProfileContextValue {
  profile: Profile;
  updateProfile: (changes: Partial<Profile>) => void;
  toggleDestination: (city: string) => void;
  togglePlace: (place: ExplorePlace) => void;
  resetProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(() => ({
    ...EMPTY_PROFILE,
    ...readStored<Partial<Profile>>(STORAGE_KEYS.profile, {}),
  }));

  const updateProfile = useCallback((changes: Partial<Profile>) => {
    setProfile(previous => {
      const next = { ...previous, ...changes };
      writeStored(STORAGE_KEYS.profile, next);
      return next;
    });
  }, []);

  const toggleDestination = useCallback((city: string) => {
    setProfile(previous => {
      const saved = previous.savedDestinations;
      const next = {
        ...previous,
        savedDestinations: saved.includes(city)
          ? saved.filter(item => item !== city)
          : [...saved, city],
      };
      writeStored(STORAGE_KEYS.profile, next);
      return next;
    });
  }, []);

  const togglePlace = useCallback((place: ExplorePlace) => {
    setProfile(previous => {
      const saved = previous.savedPlaces;
      const next = {
        ...previous,
        savedPlaces: saved.some(item => item.id === place.id)
          ? saved.filter(item => item.id !== place.id)
          : [...saved, place],
      };
      writeStored(STORAGE_KEYS.profile, next);
      return next;
    });
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(EMPTY_PROFILE);
    writeStored(STORAGE_KEYS.profile, null);
  }, []);

  const value = useMemo(
    () => ({ profile, updateProfile, toggleDestination, togglePlace, resetProfile }),
    [profile, updateProfile, toggleDestination, togglePlace, resetProfile]
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used inside ProfileProvider');
  return context;
}
