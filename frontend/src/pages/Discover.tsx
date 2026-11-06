import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Search, SearchX, Sparkles, Utensils } from 'lucide-react';
import DestinationCard from '../components/DestinationCard';
import { Dialog, EmptyState, PlaceImage, SaveHeart } from '../components/ui';
import { COUNTRIES, DESTINATIONS, INTERESTS, type Destination } from '../lib/catalog';

const FOOD = 'food';

function Dish({ name, city }: { name: string; city?: string }) {
  return (
    <div className="card overflow-hidden">
      <PlaceImage query={name} width={480} alt={name} icon={Utensils} className="h-32 w-full" />
      <div className="p-3">
        <p className="font-bold leading-snug">{name}</p>
        {city && <p className="text-xs text-ink-soft">Try it in {city}</p>}
      </div>
    </div>
  );
}

function DestinationDetails({ destination }: { destination: Destination }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {destination.photos.map((photo, index) => (
          <PlaceImage
            key={photo}
            query={photo}
            width={640}
            alt={photo}
            className={`rounded-xl ${index === 0 ? 'col-span-3 h-52' : 'col-span-3 h-32 sm:col-span-1 sm:h-24'}`}
          />
        ))}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1 text-sm font-semibold text-forest-500">
            <MapPin size={14} /> {destination.region}, {destination.country}
          </p>
          <p className="mt-1 text-ink-soft">{destination.blurb}</p>
        </div>
        <SaveHeart city={destination.city} className="border border-line" />
      </div>

      <section>
        <h3 className="mb-2 font-bold">Local food to try</h3>
        <div className="grid grid-cols-2 gap-3">
          {destination.foods.map(food => <Dish key={food} name={food} />)}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link to={`/planner?city=${encodeURIComponent(destination.query)}`} className="btn-primary">
          <Sparkles size={15} /> Plan this trip
        </Link>
        <Link to={`/explore?city=${encodeURIComponent(destination.query)}`} className="btn-secondary">
          Explore places
        </Link>
      </div>
    </div>
  );
}

function DiscoverContent({ initialQuery }: { initialQuery: string }) {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [country, setCountry] = useState('');
  const [interest, setInterest] = useState('');

  const viewing = DESTINATIONS.find(d => d.city === params.get('view')) ?? null;

  const closeDetails = () => {
    const next = new URLSearchParams(params);
    next.delete('view');
    setParams(next);
  };

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return DESTINATIONS.filter(destination =>
      (!country || destination.country === country) &&
      (!interest || interest === FOOD || destination.tags.includes(interest)) &&
      (!term || `${destination.city} ${destination.region} ${destination.country} ${destination.blurb}`
        .toLowerCase().includes(term))
    );
  }, [query, country, interest]);

  const dishes = useMemo(() => {
    const seen = new Set<string>();
    return matches.flatMap(destination =>
      destination.foods.flatMap(food => {
        if (seen.has(food)) return [];
        seen.add(food);
        return [{ food, city: destination.city }];
      })
    );
  }, [matches]);

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-5">
      <h1 className="text-3xl font-extrabold">Discover</h1>
      <p className="mt-1 text-ink-soft">Find your next destination by place, interest or food.</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search by destination or region"
            aria-label="Search destinations"
            className="input pl-9"
          />
        </div>
        <select
          aria-label="Filter by country"
          value={country}
          onChange={event => setCountry(event.target.value)}
          className="input sm:w-52"
        >
          <option value="">All countries</option>
          {COUNTRIES.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by interest">
        <button type="button" aria-pressed={!interest} onClick={() => setInterest('')} className={`chip ${!interest ? 'chip-active' : ''}`}>
          All
        </button>
        {INTERESTS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" aria-pressed={interest === key} onClick={() => setInterest(key)} className={`chip ${interest === key ? 'chip-active' : ''}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
        <button type="button" aria-pressed={interest === FOOD} onClick={() => setInterest(FOOD)} className={`chip ${interest === FOOD ? 'chip-active' : ''}`}>
          <Utensils size={15} /> Food
        </button>
      </div>

      <div className="mt-5">
        {matches.length === 0 && (
          <EmptyState icon={SearchX} title="No destinations match">
            Try another name or clear the filters. You can also plan a trip to any city from the AI Trip Planner.
          </EmptyState>
        )}

        {matches.length > 0 && interest === FOOD && (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {dishes.map(({ food, city }) => (
              <li key={food}><Dish name={food} city={city} /></li>
            ))}
          </ul>
        )}

        {matches.length > 0 && interest !== FOOD && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {matches.map(destination => (
              <li key={destination.city}><DestinationCard destination={destination} tall /></li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={viewing !== null} title={viewing?.city ?? 'Destination'} onClose={closeDetails}>
        {viewing && <DestinationDetails destination={viewing} />}
      </Dialog>
    </div>
  );
}

/** A search from the top bar starts Discover again with that term. */
export default function Discover() {
  const [params] = useSearchParams();
  const query = params.get('q') ?? '';
  return <DiscoverContent key={query} initialQuery={query} />;
}
