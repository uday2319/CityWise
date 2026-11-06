import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Droplets,
  Heart,
  MapPin,
  Sparkles,
  Wind,
} from 'lucide-react';
import { itineraApi } from '../api/itineraApi';
import DestinationCard from '../components/DestinationCard';
import { PlaceImage, SaveHeart, Skeleton, usePhoto } from '../components/ui';
import { useProfile } from '../context/ProfileContext';
import { useTrips } from '../context/TripContext';
import { DESTINATIONS, FEATURED, INTERESTS, type Destination } from '../lib/catalog';
import { dayDate, inr, tripStopKeys } from '../lib/format';

function Hero({
  destination,
  onStep,
}: {
  destination: Destination;
  onStep: (direction: -1 | 1) => void;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photoName = destination.photos[photoIndex];
  const { data: photo } = usePhoto(photoName, undefined, 1600);

  return (
    <section
      aria-label={`Featured destination: ${destination.city}`}
      className="relative isolate flex min-h-[340px] overflow-hidden rounded-3xl bg-pine text-white shadow-soft lg:min-h-[390px]"
    >
      {photo?.url && (
        <img
          key={photo.url}
          src={photo.url}
          alt={photoName}
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-pine/90 via-pine/45 to-transparent" />

      <div className="flex max-w-xl flex-1 flex-col justify-end p-6 sm:p-8">
        <p className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
          <MapPin size={14} /> {destination.region}, {destination.country}
        </p>
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
          Discover {destination.city}
        </h1>
        <p className="mt-2 text-base text-white/95">{destination.blurb}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to={`/planner?city=${encodeURIComponent(destination.query)}`}
            className="btn bg-ember-500 px-5 py-3 text-ink hover:bg-ember-100"
          >
            Plan a Trip <ArrowRight size={16} />
          </Link>
          <Link
            to={`/explore?city=${encodeURIComponent(destination.query)}`}
            className="btn border border-white/70 px-5 py-3 text-white hover:bg-white/15"
          >
            Explore
          </Link>
        </div>
      </div>

      <SaveHeart city={destination.city} className="absolute right-4 top-4" />

      <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col gap-2 sm:flex" role="group" aria-label="Photo gallery">
        {destination.photos.map((name, index) => (
          <button
            key={name}
            type="button"
            aria-label={`Show ${name}`}
            aria-pressed={index === photoIndex}
            onClick={() => setPhotoIndex(index)}
            className={`h-16 w-20 overflow-hidden rounded-xl border-2 transition-colors ${
              index === photoIndex ? 'border-ember-500' : 'border-white/80'
            }`}
          >
            <PlaceImage query={name} width={200} alt="" className="h-full w-full" />
          </button>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 flex gap-2">
        <button type="button" aria-label="Previous destination" onClick={() => onStep(-1)} className="icon-btn bg-white/90 text-ink hover:bg-white">
          <ChevronLeft size={18} />
        </button>
        <button type="button" aria-label="Next destination" onClick={() => onStep(1)} className="icon-btn bg-white/90 text-ink hover:bg-white">
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}

function WeatherCard({ destination }: { destination: Destination }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['weather', destination.latitude, destination.longitude],
    queryFn: () => itineraApi.getWeather(destination.latitude, destination.longitude),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="rounded-2xl bg-forest-800 p-4 text-white shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">{destination.city}, {destination.country}</p>
          <p className="text-sm text-forest-100">{data?.condition ?? 'Current weather'}</p>
        </div>
        {data ? (
          <span className="text-3xl font-extrabold">{Math.round(data.temperature_c)}°C</span>
        ) : (
          <CloudSun size={30} className="text-forest-200" />
        )}
      </div>
      {isLoading && <Skeleton className="mt-2 h-4 bg-white/15" />}
      {isError && <p className="mt-2 text-sm text-forest-100">Weather is unavailable right now.</p>}
      {data && (
        <div className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs text-forest-100">
          <span>High {Math.round(data.high_c)}° · Low {Math.round(data.low_c)}°</span>
          <span className="flex items-center gap-1"><Droplets size={12} /> {data.humidity_pct}%</span>
          <span className="flex items-center gap-1"><Wind size={12} /> {Math.round(data.wind_kmh)} km/h</span>
        </div>
      )}
    </div>
  );
}

function NextTrip() {
  const { current, savedTrips, showTrip } = useTrips();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = savedTrips
    .filter(trip => trip.startDate && trip.startDate >= today)
    .sort((a, b) => (a.startDate as string).localeCompare(b.startDate as string))[0];
  const trip = upcoming ?? savedTrips[0] ?? current;

  if (!trip) {
    return (
      <Link to="/planner" className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-lift">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ember-50 text-ember-700">
          <Sparkles size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">Plan your first trip</span>
          <span className="block text-sm text-ink-soft">Get a day-by-day itinerary</span>
        </span>
        <ChevronRight size={18} className="text-ink-mute" />
      </Link>
    );
  }

  const city = trip.itinerary.city;
  return (
    <Link
      to={`/trip/${trip.id}`}
      onClick={() => showTrip(trip)}
      className="card flex items-center gap-3 p-3 transition-shadow hover:shadow-lift"
    >
      <PlaceImage
        query={trip.itinerary.days[0]?.attractions[0]?.name ?? city}
        context={city}
        width={200}
        alt=""
        className="h-14 w-14 flex-shrink-0 rounded-xl"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-forest-500">Your next trip</span>
        <span className="block truncate font-bold">{trip.name}</span>
        <span className="block truncate text-xs text-ink-soft">
          {trip.startDate ? `From ${dayDate(trip.startDate, 1)} · ` : ''}
          {inr(trip.itinerary.total_budget_actual * trip.travellers)} est.
        </span>
      </span>
      <ChevronRight size={18} className="text-ink-mute" />
    </Link>
  );
}

function TravelStats() {
  const { savedTrips } = useTrips();
  const { profile } = useProfile();

  const allStops = savedTrips.flatMap(trip => tripStopKeys(trip.itinerary.days));
  const visited = savedTrips.reduce((sum, trip) => sum + trip.visited.length, 0);
  const progress = allStops.length ? Math.round((visited / allStops.length) * 100) : 0;

  const stats = [
    { icon: Briefcase, value: savedTrips.length, label: 'Saved trips' },
    { icon: Heart, value: profile.savedDestinations.length + profile.savedPlaces.length, label: 'Favorites' },
    { icon: CheckCircle2, value: visited, label: 'Stops visited' },
  ];

  return (
    <div className="card p-4">
      <ul className="grid grid-cols-3 gap-2 text-center">
        {stats.map(({ icon: Icon, value, label }) => (
          <li key={label}>
            <Icon size={18} className="mx-auto text-forest-500" />
            <span className="block text-xl font-extrabold">{value}</span>
            <span className="block text-xs text-ink-soft">{label}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-semibold">Travel progress</span>
        <span className="font-bold text-forest-700">{progress}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-forest-50">
        <div className="h-full rounded-full bg-teal-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [interest, setInterest] = useState('');
  const hero = FEATURED[heroIndex];

  const shown = DESTINATIONS
    .filter(destination => !interest || destination.tags.includes(interest))
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-5 sm:px-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Hero
          key={hero.city}
          destination={hero}
          onStep={direction =>
            setHeroIndex(index => (index + direction + FEATURED.length) % FEATURED.length)
          }
        />
        <div className="grid content-start gap-4 md:grid-cols-3 xl:grid-cols-1">
          <WeatherCard destination={hero} />
          <NextTrip />
          <TravelStats />
        </div>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-2xl font-extrabold">Popular Destinations</h2>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter destinations">
            <button
              type="button"
              aria-pressed={!interest}
              onClick={() => setInterest('')}
              className={`chip py-1 ${!interest ? 'chip-active' : ''}`}
            >
              All
            </button>
            {INTERESTS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                aria-pressed={interest === key}
                onClick={() => setInterest(key)}
                className={`chip py-1 ${interest === key ? 'chip-active' : ''}`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
          <Link to="/discover" className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:underline">
            View all <ArrowRight size={15} />
          </Link>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map(destination => (
            <li key={destination.city}>
              <DestinationCard destination={destination} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
