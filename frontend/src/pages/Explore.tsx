import { lazy, Suspense, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  ExternalLink,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  Search,
  SearchX,
  Sparkles,
} from 'lucide-react';
import { apiErrorMessage, itineraApi } from '../api/itineraApi';
import CityInput from '../components/CityInput';
import {
  Dialog,
  EmptyState,
  ErrorNotice,
  PlaceImage,
  SaveHeart,
  SavePlaceHeart,
  Skeleton,
  usePhoto,
} from '../components/ui';
import { DESTINATIONS, INTERESTS, interestByKey } from '../lib/catalog';
import { placeUrl } from '../lib/format';
import type { ExplorePlace } from '../types';

const PlacesMap = lazy(() => import('../components/PlacesMap'));

function PlaceDetails({ place }: { place: ExplorePlace }) {
  const { data: photo } = usePhoto(place.name, place.city);

  return (
    <div className="space-y-3 text-sm">
      <PlaceImage
        query={place.name}
        context={place.city}
        alt={place.name}
        className="h-48 w-full rounded-xl"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-forest-500">{place.category}</p>
        <SavePlaceHeart place={place} className="border border-line" />
      </div>
      {photo?.description && <p className="text-ink-soft">{photo.description}</p>}
      {place.address && (
        <p className="flex gap-2 text-ink-soft">
          <MapPin size={16} className="mt-0.5 flex-shrink-0" /> {place.address}
        </p>
      )}
      <p className="flex gap-2 text-ink-soft">
        <Clock size={16} className="mt-0.5 flex-shrink-0" />
        Allow about {place.visit_duration_hours} hours
        {place.opening_hours ? ` · ${place.opening_hours}` : ''}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <a href={placeUrl(place.name, place)} target="_blank" rel="noreferrer" className="btn-secondary">
          Google Maps <ExternalLink size={14} />
        </a>
        {place.website && (
          <a href={place.website} target="_blank" rel="noreferrer" className="btn-secondary">
            Website <ExternalLink size={14} />
          </a>
        )}
        <Link
          to={`/planner?city=${encodeURIComponent(place.city)}`}
          className="btn-primary"
        >
          <Sparkles size={15} /> Plan a trip here
        </Link>
      </div>
    </div>
  );
}

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const city = params.get('city') ?? '';
  const interestKey = params.get('interest');
  const interest = interestByKey(interestKey);

  const [cityInput, setCityInput] = useState(city);
  const [nameFilter, setNameFilter] = useState('');
  const [category, setCategory] = useState('');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [selected, setSelected] = useState<ExplorePlace | null>(null);

  const setFilters = (nextCity: string, nextInterest?: string | null) => {
    const next = new URLSearchParams();
    if (nextCity) next.set('city', nextCity);
    if (nextInterest) next.set('interest', nextInterest);
    setParams(next);
    setCategory('');
    setNameFilter('');
  };

  const submitCity = (event: FormEvent) => {
    event.preventDefault();
    setFilters(cityInput.trim(), interestKey);
  };

  const { data: places = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['explore', city.toLowerCase(), interestKey],
    queryFn: () => itineraApi.explorePlaces(city, interestKey ?? undefined),
    enabled: city.trim().length >= 2,
    staleTime: 10 * 60 * 1000,
  });

  const categories = useMemo(
    () => [...new Set(places.map(place => place.category))].sort(),
    [places]
  );

  const visible = places.filter(
    place =>
      (!category || place.category === category) &&
      place.name.toLowerCase().includes(nameFilter.trim().toLowerCase())
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold">Explore destinations</h1>
      <p className="mt-3 border-l-4 border-ember-500 pl-3 text-xl font-bold leading-snug text-forest-900">
        Every Destination Has a Story. Start Yours Today.
      </p>
      <p className="mt-1 text-ink-soft">
        Search a city to see its places, then narrow them down by interest.
      </p>

      <form onSubmit={submitCity} className="card mt-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <CityInput value={cityInput} onChange={setCityInput} label="City" required />
        </div>
        <button type="submit" className="btn-primary h-[42px] px-6">
          <Search size={16} /> Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by interest">
        <button
          type="button"
          aria-pressed={!interest}
          onClick={() => setFilters(city, null)}
          className={`chip ${!interest ? 'chip-active' : ''}`}
        >
          All places
        </button>
        {INTERESTS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            aria-pressed={interestKey === key}
            onClick={() => setFilters(city, key)}
            className={`chip ${interestKey === key ? 'chip-active' : ''}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {!city && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-bold">Popular places to start</h2>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {DESTINATIONS.map(destination => (
              <li key={destination.city} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setCityInput(destination.query);
                    setFilters(destination.query, interestKey);
                  }}
                  className="card h-full w-full overflow-hidden text-left transition-shadow hover:shadow-lift"
                >
                  <PlaceImage
                    query={destination.photos[0]}
                    width={640}
                    alt={destination.photos[0]}
                    className="h-36 w-full"
                  />
                  <div className="p-3.5">
                    <h3 className="font-bold">{destination.city}</h3>
                    <p className="text-sm text-ink-soft">{destination.blurb}</p>
                  </div>
                </button>
                <SaveHeart city={destination.city} className="absolute right-2.5 top-2.5" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {city && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
              <input
                type="search"
                value={nameFilter}
                onChange={event => setNameFilter(event.target.value)}
                placeholder={`Search attractions in ${city}`}
                aria-label="Search attractions by name"
                className="input pl-9"
              />
            </div>
            {categories.length > 1 && (
              <select
                aria-label="Filter by category"
                value={category}
                onChange={event => setCategory(event.target.value)}
                className="input w-auto"
              >
                <option value="">All categories</option>
                {categories.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            )}
            <div className="flex rounded-xl border border-line bg-white p-1" role="group" aria-label="View">
              {([['list', LayoutGrid, 'List'], ['map', MapIcon, 'Map']] as const).map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={view === mode}
                  onClick={() => setView(mode)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    view === mode ? 'bg-forest-800 text-white' : 'text-ink-soft hover:bg-forest-50'
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5" aria-live="polite">
            {isLoading && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading places">
                {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-60" />)}
              </div>
            )}

            {isError && (
              <ErrorNotice onRetry={() => refetch()}>
                {apiErrorMessage(error, 'Places could not be loaded.')}
              </ErrorNotice>
            )}

            {!isLoading && !isError && visible.length === 0 && (
              <EmptyState icon={SearchX} title="No places found">
                {places.length > 0
                  ? 'No places match these filters. Try clearing the search.'
                  : `We could not find ${interest ? interest.label.toLowerCase() : 'places'} around ${city}. Try another interest or check the city name.`}
              </EmptyState>
            )}

            {visible.length > 0 && view === 'list' && (
              <>
                <p className="mb-3 text-sm text-ink-soft">
                  {visible.length} {visible.length === 1 ? 'place' : 'places'} around {city}
                </p>
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map(place => (
                    <li key={place.id} className="relative">
                      <SavePlaceHeart place={place} className="absolute right-2.5 top-2.5 z-10" />
                      <button
                        type="button"
                        onClick={() => setSelected(place)}
                        className="card h-full w-full overflow-hidden text-left transition-shadow hover:shadow-lift"
                      >
                        <PlaceImage
                          query={place.name}
                          context={place.city}
                          width={480}
                          alt={place.name}
                          className="h-40 w-full"
                        />
                        <div className="p-4">
                          <h3 className="font-bold leading-snug">{place.name}</h3>
                          <p className="text-sm font-semibold text-forest-500">{place.category}</p>
                          {place.address && (
                            <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{place.address}</p>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {visible.length > 0 && view === 'map' && (
              <div className="card h-[560px] overflow-hidden">
                <Suspense fallback={<Skeleton className="h-full rounded-none" />}>
                  <PlacesMap
                    places={visible}
                    selectedId={selected?.id ?? null}
                    onSelect={setSelected}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </>
      )}

      <Dialog
        open={selected !== null}
        title={selected?.name ?? 'Place details'}
        onClose={() => setSelected(null)}
      >
        {selected && <PlaceDetails place={selected} />}
      </Dialog>
    </div>
  );
}
