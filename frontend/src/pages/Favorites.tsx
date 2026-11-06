import { Link } from 'react-router-dom';
import { Heart, MapPin } from 'lucide-react';
import DestinationCard from '../components/DestinationCard';
import { EmptyState, PlaceImage, SavePlaceHeart } from '../components/ui';
import { useProfile } from '../context/ProfileContext';
import { DESTINATIONS } from '../lib/catalog';
import { placeUrl } from '../lib/format';

export default function Favorites() {
  const { profile } = useProfile();
  const destinations = DESTINATIONS.filter(d => profile.savedDestinations.includes(d.city));
  const places = profile.savedPlaces;

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-5">
      <h1 className="text-3xl font-extrabold">Favorites</h1>
      <p className="mt-1 text-ink-soft">Places you’ve saved, kept on this device.</p>

      {destinations.length === 0 && places.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={Heart}
            title="Nothing saved yet"
            action={<Link to="/discover" className="btn-primary">Discover destinations</Link>}
          >
            Press the heart on any destination or place to keep it here.
          </EmptyState>
        </div>
      )}

      {destinations.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-3 text-xl font-bold">Destinations</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {destinations.map(destination => (
              <li key={destination.city}><DestinationCard destination={destination} /></li>
            ))}
          </ul>
        </section>
      )}

      {places.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-xl font-bold">Places</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {places.map(place => (
              <li key={place.id} className="card relative overflow-hidden">
                <PlaceImage query={place.name} context={place.city} width={480} alt={place.name} className="h-36 w-full" />
                <SavePlaceHeart place={place} className="absolute right-2.5 top-2.5" />
                <div className="p-3.5">
                  <h3 className="font-bold leading-snug">{place.name}</h3>
                  <p className="text-sm text-ink-soft">{place.category} · {place.city}</p>
                  <a
                    href={placeUrl(place.name, place)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:underline"
                  >
                    <MapPin size={14} /> View on map
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
