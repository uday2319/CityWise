// localStorage can be unavailable or full, so neither call is allowed to throw.

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/** Returns false when the value could not be stored. */
export function writeStored(key: string, value: unknown): boolean {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const STORAGE_KEYS = {
  currentTrip: 'citywise.currentTrip',
  savedTrips: 'citywise.savedTrips',
  profile: 'citywise.profile',
} as const;
