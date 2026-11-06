import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Download,
  Info,
  List,
  Map as MapIcon,
  Plus,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { apiErrorMessage, itineraApi } from '../api/itineraApi';
import BudgetPanel from '../components/BudgetPanel';
import ItineraryCard from '../components/ItineraryCard';
import RouteDetails from '../components/RouteDetails';
import TravelInfoPanel, { TripInfoEmpty } from '../components/TravelInfoPanel';
import TripForm from '../components/TripForm';
import { Dialog, ErrorNotice, Skeleton } from '../components/ui';
import { useProfile } from '../context/ProfileContext';
import { useTrips } from '../context/TripContext';
import { INTERESTS } from '../lib/catalog';
import { downloadTrip } from '../lib/exportTrip';
import { cleanTitle, dayDate, inr } from '../lib/format';
import { useDayRoute, useTripRouteTotals } from '../lib/routes';
import { addStop, moveStop, removeStop } from '../lib/tripEdits';
import type { ExplorePlace, ItineraryRequest, RouteLeg, RouteMode, Trip } from '../types';

const ItineraryMap = lazy(() => import('../components/ItineraryMap'));
const EmptyMap = lazy(() =>
  import('../components/ItineraryMap').then(module => ({ default: module.EmptyMap }))
);

type Panel = 'plan' | 'map' | 'info';

const PANEL_TABS: { key: Panel; label: string; icon: typeof List }[] = [
  { key: 'plan', label: 'Itinerary', icon: List },
  { key: 'map', label: 'Map', icon: MapIcon },
  { key: 'info', label: 'Trip info', icon: Info },
];

const GRID =
  'lg:grid lg:h-[calc(100vh-8.75rem)] lg:min-h-[560px] lg:gap-3 ' +
  'lg:grid-cols-[290px_minmax(0,1fr)_240px] xl:grid-cols-[310px_minmax(0,1fr)_260px] ' +
  '2xl:grid-cols-[370px_minmax(0,1fr)_320px]';

const panelClass = (shown: boolean) => `${shown ? '' : 'hidden'} lg:block`;

function PanelTabs({ panel, onChange }: { panel: Panel; onChange: (panel: Panel) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Trip panels"
      className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-line bg-white p-1 lg:hidden"
    >
      {PANEL_TABS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={panel === key}
          onClick={() => onChange(key)}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold ${
            panel === key ? 'bg-forest-800 text-white' : 'text-ink-soft'
          }`}
        >
          <Icon size={15} /> {label}
        </button>
      ))}
    </div>
  );
}

function PlaceSearch({
  city,
  taken,
  onChoose,
}: {
  city: string;
  taken: string[];
  onChoose: (place: ExplorePlace) => void;
}) {
  const [term, setTerm] = useState('');
  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['explore', city.toLowerCase(), null],
    queryFn: () => itineraApi.explorePlaces(city),
    staleTime: 10 * 60 * 1000,
  });

  const options = data
    .filter(place => !taken.includes(place.name))
    .filter(place => place.name.toLowerCase().includes(term.trim().toLowerCase()))
    .slice(0, 30);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
        <input
          type="search"
          value={term}
          onChange={event => setTerm(event.target.value)}
          placeholder={`Search places in ${city}`}
          aria-label="Search places to add"
          className="input pl-9"
        />
      </div>
      {isLoading && <Skeleton className="h-40" />}
      {isError && (
        <ErrorNotice onRetry={() => refetch()}>
          {apiErrorMessage(error, 'Places could not be loaded.')}
        </ErrorNotice>
      )}
      {!isLoading && !isError && options.length === 0 && (
        <p className="py-6 text-center text-sm text-ink-soft">No more places match.</p>
      )}
      <ul className="max-h-80 space-y-1 overflow-y-auto">
        {options.map(place => (
          <li key={place.id}>
            <button
              type="button"
              onClick={() => onChoose(place)}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-forest-50"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{place.name}</span>
                <span className="block text-xs text-ink-soft">{place.category}</span>
              </span>
              <Plus size={16} className="flex-shrink-0 text-forest-700" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TripHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <h1 className="text-xl font-extrabold">{title}</h1>
      {subtitle && <div className="flex flex-wrap items-center gap-2 text-sm">{subtitle}</div>}
      <div className="ml-auto flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

const pill = 'inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold';

function Workspace({ trip }: { trip: Trip }) {
  const navigate = useNavigate();
  const { generate, generating, saveTrip, updateTrip } = useTrips();

  const [dayNumber, setDayNumber] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('map');
  const [mode, setMode] = useState<RouteMode>('drive');
  const [dialog, setDialog] = useState<'route' | 'budget' | 'add' | null>(null);
  const [composing, setComposing] = useState(false);

  const { itinerary } = trip;
  const day = itinerary.days.find(d => d.day === dayNumber) ?? itinerary.days[0];

  const route = useDayRoute(day, mode);
  const totals = useTripRouteTotals(itinerary.days, mode);

  const legs = useMemo(() => {
    const byStart = new Map<string, RouteLeg>();
    route.data?.legs.forEach((leg, index) => {
      const from = route.waypoints[index];
      if (from) byStart.set(from.key, leg);
    });
    return byStart;
  }, [route.data, route.waypoints]);

  const changeDay = (next: number) => {
    setDayNumber(next);
    setSelected(null);
  };

  const toggleVisited = (key: string) =>
    updateTrip(trip.id, {
      visited: trip.visited.includes(key)
        ? trip.visited.filter(item => item !== key)
        : [...trip.visited, key],
    });

  const regenerate = async () => {
    const shown = itinerary.days.flatMap(d => d.attractions.map(a => a.name));
    const next = await generate({
      request: {
        ...trip.request,
        exclude_places: [...new Set([...(trip.request.exclude_places ?? []), ...shown])],
      },
      travellers: trip.travellers,
    });
    if (!next) return;

    const names = next.itinerary.days.flatMap(d => d.attractions.map(a => a.name));
    if (names.every(name => shown.includes(name))) {
      toast('No other matching places were found, so the plan is unchanged.');
    } else {
      toast.success('New itinerary ready');
    }
    navigate(`/trip/${next.id}`);
  };

  const startNew = async (request: ItineraryRequest, travellers: number) => {
    const next = await generate({ request, travellers });
    if (next) {
      toast.success('Your itinerary is ready');
      setComposing(false);
      navigate(`/trip/${next.id}`);
    }
  };

  return (
    <div className="px-3 py-3 sm:px-4">
      <TripHeader
        title="AI Trip Planner"
        subtitle={
          <>
            <span className="font-semibold">{itinerary.city}</span>
            <span className={pill}><CalendarDays size={13} /> {itinerary.duration_days} {itinerary.duration_days === 1 ? 'day' : 'days'}</span>
            <span className={pill}><Users size={13} /> {trip.travellers} {trip.travellers === 1 ? 'traveller' : 'travellers'}</span>
            <span className={pill}>{inr(itinerary.total_budget_actual * trip.travellers)} est.</span>
          </>
        }
      >
        <button type="button" onClick={() => setComposing(value => !value)} className="btn-secondary py-2">
          <Plus size={15} /> {composing ? 'Back to trip' : 'New trip'}
        </button>
        <button type="button" onClick={regenerate} disabled={generating} className="btn-secondary py-2">
          <RefreshCw size={15} className={generating ? 'animate-spin' : ''} />
          {generating ? 'Working' : 'Regenerate'}
        </button>
        <button type="button" onClick={() => saveTrip(trip)} disabled={trip.saved} className="btn-primary py-2">
          {trip.saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          {trip.saved ? 'Saved' : 'Save trip'}
        </button>
        <button
          type="button"
          onClick={() => {
            downloadTrip(trip);
            toast.success('Itinerary downloaded');
          }}
          className="btn-secondary py-2"
        >
          <Download size={15} /> Download
        </button>
      </TripHeader>

      <PanelTabs panel={panel} onChange={setPanel} />

      <div className={GRID}>
        <section
          aria-label={`Day ${day.day} itinerary`}
          className={`${panelClass(panel === 'plan')} card overflow-y-auto p-3`}
        >
          {composing ? (
            <>
              <h2 className="mb-3 text-lg font-extrabold">New trip</h2>
              <TripForm initial={{ city: itinerary.city }} loading={generating} onSubmit={startNew} />
            </>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <label htmlFor="trip-start" className="text-xs font-semibold text-ink-soft">Start date</label>
                <input
                  id="trip-start"
                  type="date"
                  value={trip.startDate ?? ''}
                  onChange={event => updateTrip(trip.id, { startDate: event.target.value || undefined })}
                  className="rounded-lg border border-line px-2 py-1 text-xs"
                />
              </div>

              <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Choose a day">
                {itinerary.days.map(d => (
                  <button
                    key={d.day}
                    type="button"
                    aria-pressed={d.day === day.day}
                    onClick={() => changeDay(d.day)}
                    className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-center text-sm font-bold transition-colors ${
                      d.day === day.day
                        ? 'bg-forest-800 text-white'
                        : 'border border-line bg-white text-ink-soft hover:bg-forest-50'
                    }`}
                  >
                    Day {d.day}
                    {trip.startDate && (
                      <span className="block text-[11px] font-medium">{dayDate(trip.startDate, d.day)}</span>
                    )}
                  </button>
                ))}
              </div>

              {cleanTitle(day.title, day.day).includes('Leisure') && (
                <p className="mb-2 rounded-lg bg-forest-50 px-3 py-1.5 text-xs font-medium text-forest-800">
                  A relaxed day with fewer stops.
                </p>
              )}

              <ItineraryCard
                day={day}
                city={itinerary.city}
                selected={selected}
                visited={trip.visited}
                legs={legs}
                onSelect={setSelected}
                onToggleVisited={toggleVisited}
                onMove={(index, direction) =>
                  updateTrip(trip.id, { itinerary: moveStop(itinerary, day.day, index, direction) })
                }
                onRemove={index => {
                  updateTrip(trip.id, { itinerary: removeStop(itinerary, day.day, index) });
                  setSelected(null);
                }}
                onAdd={() => setDialog('add')}
              />
            </>
          )}
        </section>

        <section
          aria-label="Route map"
          className={`${panelClass(panel === 'map')} card relative h-[68vh] overflow-hidden lg:h-auto`}
        >
          <Suspense fallback={<Skeleton className="h-full rounded-none" />}>
            <ItineraryMap
              day={day}
              city={itinerary.city}
              selected={selected}
              mode={mode}
              route={route.data}
              routeLoading={route.isFetching}
              routeFailed={route.isError}
              waypoints={route.waypoints}
              onSelect={setSelected}
              onMode={setMode}
              onRouteDetails={() => setDialog('route')}
            />
          </Suspense>
        </section>

        <section
          aria-label="Travel information"
          className={`${panelClass(panel === 'info')} min-h-0 overflow-y-auto`}
        >
          <TravelInfoPanel
            trip={trip}
            mode={mode}
            route={route.data}
            totals={totals}
            onBudget={() => setDialog('budget')}
          />
        </section>
      </div>

      <Dialog open={dialog === 'route'} title={`Day ${day.day} route`} onClose={() => setDialog(null)}>
        <RouteDetails waypoints={route.waypoints} route={route.data} failed={route.isError} />
      </Dialog>

      <Dialog open={dialog === 'budget'} title="Budget" wide onClose={() => setDialog(null)}>
        <BudgetPanel itinerary={itinerary} travellers={trip.travellers} />
      </Dialog>

      <Dialog open={dialog === 'add'} title={`Add a place to Day ${day.day}`} onClose={() => setDialog(null)}>
        {dialog === 'add' && (
          <PlaceSearch
            city={itinerary.city}
            taken={itinerary.days.flatMap(d => d.attractions.map(a => a.name))}
            onChoose={place => {
              updateTrip(trip.id, { itinerary: addStop(itinerary, day.day, place) });
              setDialog(null);
              toast.success(`${place.name} added`);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function numberParam(value: string | null): number | undefined {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function NewTripWorkspace({ notFound }: { notFound: boolean }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { generate, generating } = useTrips();
  const { profile } = useProfile();
  const [panel, setPanel] = useState<Panel>('plan');

  const interest = params.get('interest');
  const initial = {
    city: params.get('city') ?? profile.homeCity,
    days: numberParam(params.get('days')),
    budget: numberParam(params.get('budget')),
    travellers: numberParam(params.get('travellers')),
    interests: INTERESTS.some(item => item.key === interest) ? [interest as string] : [],
    preference: profile.travelStyle,
  };

  const submit = async (request: ItineraryRequest, travellers: number) => {
    const trip = await generate({ request, travellers });
    if (trip) {
      toast.success('Your itinerary is ready');
      navigate(`/trip/${trip.id}`);
    }
  };

  return (
    <div className="px-3 py-3 sm:px-4">
      <TripHeader title="AI Trip Planner" />
      <PanelTabs panel={panel} onChange={setPanel} />

      <div className={GRID}>
        <section aria-label="Trip details" className={`${panelClass(panel === 'plan')} card overflow-y-auto p-3`}>
          {notFound && (
            <div className="mb-3">
              <ErrorNotice>That trip isn’t saved on this device. Plan a new one here.</ErrorNotice>
            </div>
          )}
          <h2 className="mb-3 text-lg font-extrabold">Plan your trip</h2>
          <TripForm initial={initial} loading={generating} onSubmit={submit} />
        </section>

        <section aria-label="Route map" className={`${panelClass(panel === 'map')} card h-[68vh] overflow-hidden lg:h-auto`}>
          <Suspense fallback={<Skeleton className="h-full rounded-none" />}>
            <EmptyMap message={generating ? 'Building your route…' : 'Your route will appear here'} />
          </Suspense>
        </section>

        <section aria-label="Travel information" className={`${panelClass(panel === 'info')} overflow-y-auto`}>
          <TripInfoEmpty generating={generating} />
        </section>
      </div>
    </div>
  );
}

/** Serves /planner, /maps and /trip/:id with the same three panels. */
export default function TripView() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { current, findTrip } = useTrips();

  const trip = id ? findTrip(id) : current;

  // A destination in the link means the visitor is starting something new.
  if (!trip || (!id && params.has('city'))) {
    return <NewTripWorkspace notFound={!!id && !trip} />;
  }

  return <Workspace key={trip.id} trip={trip} />;
}
