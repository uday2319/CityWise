import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Heart, Info, X } from 'lucide-react';
import CityInput from '../components/CityInput';
import { useProfile } from '../context/ProfileContext';
import { useTrips } from '../context/TripContext';
import { LANGUAGES } from '../lib/languages';

export default function Profile() {
  const { profile, updateProfile, toggleDestination, resetProfile } = useProfile();
  const { clearAll, savedTrips } = useTrips();

  const [name, setName] = useState(profile.name);
  const [homeCity, setHomeCity] = useState(profile.homeCity);
  const [travelStyle, setTravelStyle] = useState(profile.travelStyle);
  const [sourceLanguage, setSourceLanguage] = useState(profile.sourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState(profile.targetLanguage);
  const [confirmClear, setConfirmClear] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    updateProfile({ name: name.trim(), homeCity: homeCity.trim(), travelStyle: travelStyle.trim(), sourceLanguage, targetLanguage });
    toast.success('Profile saved');
  };

  const clearEverything = () => {
    clearAll();
    resetProfile();
    setName('');
    setHomeCity('');
    setTravelStyle('');
    setSourceLanguage('en');
    setTargetLanguage('hi');
    setConfirmClear(false);
    toast.success('All CityWise data cleared from this device');
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold">Profile</h1>
      <p className="mt-2 flex items-start gap-2 text-sm text-ink-soft">
        <Info size={15} className="mt-0.5 flex-shrink-0" />
        CityWise has no sign-in yet, so your profile stays in this browser and is not synced.
      </p>

      <form onSubmit={submit} className="card mt-5 space-y-5 p-5 sm:p-6">
        <h2 className="text-lg font-bold">Your details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-name" className="label">Name</label>
            <input
              id="profile-name"
              className="input"
              value={name}
              maxLength={60}
              autoComplete="name"
              onChange={event => setName(event.target.value)}
            />
          </div>
          <CityInput
            value={homeCity}
            onChange={setHomeCity}
            label="Default destination"
            placeholder="Used to start new trips"
          />
        </div>

        <div>
          <label htmlFor="profile-style" className="label">Travel preferences</label>
          <textarea
            id="profile-style"
            rows={3}
            maxLength={300}
            value={travelStyle}
            onChange={event => setTravelStyle(event.target.value)}
            placeholder="For example: vegetarian food, slow mornings and historic sites"
            className="input resize-none"
          />
          <p className="mt-1 text-xs text-ink-soft">Filled in for you on the trip planner.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-source" className="label">I speak</label>
            <select id="profile-source" className="input" value={sourceLanguage} onChange={e => setSourceLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="profile-target" className="label">Usually translate to</label>
            <select id="profile-target" className="input" value={targetLanguage} onChange={e => setTargetLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <button type="submit" className="btn-primary">Save profile</button>
      </form>

      <section className="card mt-5 p-5 sm:p-6">
        <h2 className="text-lg font-bold">Saved destinations</h2>
        {profile.savedDestinations.length === 0 ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            Press the <Heart size={14} /> on any destination to keep it here.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {profile.savedDestinations.map(city => (
              <li key={city} className="chip pr-1.5">
                <Link to={`/explore?city=${encodeURIComponent(city)}`} className="hover:underline">
                  {city}
                </Link>
                <button
                  type="button"
                  onClick={() => toggleDestination(city)}
                  aria-label={`Remove ${city}`}
                  className="rounded-full p-0.5 hover:bg-forest-100"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mt-5 p-5 sm:p-6">
        <h2 className="text-lg font-bold">Account settings</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Remove your profile and {savedTrips.length}{' '}
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
    </div>
  );
}
