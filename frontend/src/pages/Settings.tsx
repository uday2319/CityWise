import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useProfile } from '../context/ProfileContext';
import { useTrips } from '../context/TripContext';
import { LANGUAGES } from '../lib/languages';

export default function Settings() {
  const { profile, updateProfile, resetProfile } = useProfile();
  const { clearAll, savedTrips } = useTrips();
  const [confirmClear, setConfirmClear] = useState(false);

  const changeLanguage = (changes: { sourceLanguage?: string; targetLanguage?: string }) => {
    updateProfile(changes);
    toast.success('Applies the next time CityWise loads');
  };

  const clearEverything = () => {
    clearAll();
    resetProfile();
    setConfirmClear(false);
    toast.success('All CityWise data cleared from this device');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-5">
      <div>
        <h1 className="text-3xl font-extrabold">Settings</h1>
        <p className="mt-1 text-ink-soft">Preferences for this device.</p>
      </div>

      <section className="card p-5">
        <h2 className="text-lg font-bold">Voice Translator languages</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="settings-source" className="label">I speak</label>
            <select
              id="settings-source"
              className="input"
              value={profile.sourceLanguage}
              onChange={event => changeLanguage({ sourceLanguage: event.target.value })}
            >
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="settings-target" className="label">Usually translate to</label>
            <select
              id="settings-target"
              className="input"
              value={profile.targetLanguage}
              onChange={event => changeLanguage({ targetLanguage: event.target.value })}
            >
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-bold">Your data</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Remove your profile, favorites and {savedTrips.length}{' '}
          {savedTrips.length === 1 ? 'saved trip' : 'saved trips'} from this device. This can’t be undone.
        </p>
        {confirmClear ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Clear everything?</span>
            <button type="button" onClick={clearEverything} className="btn-danger">Clear data</button>
            <button type="button" onClick={() => setConfirmClear(false)} className="btn-secondary">Cancel</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmClear(true)} className="btn-secondary mt-3">
            Clear my data
          </button>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-bold">Data sources</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Places, hotels, restaurants and road routes by Geoapify and OpenStreetMap.
          Photos from Wikipedia and Wikimedia Commons, each under its own licence;
          a link to the source appears with a place’s details. Weather by Open-Meteo.
        </p>
      </section>
    </div>
  );
}
