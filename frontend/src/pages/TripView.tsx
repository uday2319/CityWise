import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, List, Map as MapIcon, MapPinned, Info } from 'lucide-react';
import BudgetPanel from '../components/BudgetPanel';
import ItineraryCard from '../components/ItineraryCard';
import RouteDetails from '../components/RouteDetails';
import TravelInfoPanel from '../components/TravelInfoPanel';
import { Dialog, EmptyState, Skeleton } from '../components/ui';
import { useTrips } from '../context/TripContext';
import { downloadTrip } from '../lib/exportTrip';
import { cleanTitle } from '../lib/format';
import type { Trip } from '../types';

const ItineraryMap = lazy(() => import('../components/ItineraryMap'));

type Panel = 'plan' | 'map' | 'info';

const PANEL_TABS: { key: Panel; label: string; icon: typeof List }[] = [
  { key: 'plan', label: 'Itinerary', icon: List },
  { key: 'map', label: 'Map', icon: MapIcon },
  { key: 'info', label: 'Trip info', icon: Info },
];

function TripWorkspace({ trip }: { trip: Trip }) {
  const navigate = useNavigate();
  const { generate, generating, saveTrip, updateTrip } = useTrips();

  const [dayNumber, setDayNumber] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('map');
  const [routeOpen, setRouteOpen] = useState(false);

  const { itinerary } = trip;
  const day = itinerary.days.find(d => d.day === dayNumber) ?? itinerary.days[0];

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
        exclude_places: [
          ...new Set([...(trip.request.exclude_places ?? []), ...shown]),
        ],
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

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link to="/trips" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-forest-800">
            <ArrowLeft size={15} /> My Trips
          </Link>
          <h1 className="truncate text-2xl font-extrabold">{trip.name}</h1>
          <p className="truncate text-sm text-ink-soft">{itinerary.preference_text}</p>
        </div>

        <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Choose a day">
          {itinerary.days.map(d => (
            <button
              key={d.day}
              type="button"
              aria-pressed={d.day === day.day}
              onClick={() => changeDay(d.day)}
              className={`flex-shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                d.day === day.day
                  ? 'bg-forest-800 text-white'
                  : 'border border-line bg-white text-ink-soft hover:bg-forest-50'
              }`}
            >
              Day {d.day}
            </button>
          ))}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Trip panels"
        className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-line bg-white p-1 xl:hidden"
      >
        {PANEL_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={panel === key}
            onClick={() => setPanel(key)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold ${
              panel === key ? 'bg-forest-800 text-white' : 'text-ink-soft'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="xl:grid xl:h-[calc(100vh-10.5rem)] xl:min-h-[620px] xl:grid-cols-[350px_minmax(0,1fr)_310px] xl:gap-4">
        <section
          aria-label={`Day ${day.day} itinerary`}
          className={`${panel === 'plan' ? '' : 'hidden'} card overflow-y-auto p-4 xl:block`}
        >
          <h2 className="mb-3 text-lg font-extrabold">
            Day {day.day}
            <span className="ml-2 text-sm font-medium text-ink-soft">
              {cleanTitle(day.title, day.day)}
            </span>
          </h2>
          <ItineraryCard
            day={day}
            city={itinerary.city}
            selected={selected}
            visited={trip.visited}
            onSelect={setSelected}
            onToggleVisited={toggleVisited}
          />
        </section>

        <section
          aria-label="Route map"
          className={`${panel === 'map' ? '' : 'hidden'} card h-[70vh] overflow-hidden xl:block xl:h-auto`}
        >
          <Suspense fallback={<Skeleton className="h-full rounded-none" />}>
            <ItineraryMap day={day} selected={selected} onSelect={setSelected} />
          </Suspense>
        </section>

        <section
          aria-label="Travel information"
          className={`${panel === 'info' ? '' : 'hidden'} min-h-0 xl:block`}
        >
          <TravelInfoPanel
            trip={trip}
            day={day}
            regenerating={generating}
            onSave={() => saveTrip(trip)}
            onDownload={() => {
              downloadTrip(trip);
              toast.success('Itinerary downloaded');
            }}
            onRegenerate={regenerate}
            onRouteDetails={() => setRouteOpen(true)}
          />
        </section>
      </div>

      <div className="mt-4">
        <BudgetPanel itinerary={itinerary} travellers={trip.travellers} />
      </div>

      <Dialog
        open={routeOpen}
        title={`Day ${day.day} route`}
        onClose={() => setRouteOpen(false)}
      >
        <RouteDetails day={day} />
      </Dialog>
    </div>
  );
}

/** Serves /trip/:id, and /maps which shows the latest trip. */
export default function TripView() {
  const { id } = useParams();
  const { current, findTrip, savedTrips } = useTrips();
  const trip = id ? findTrip(id) : current;

  if (!trip) {
    return (
      <div className="px-4 py-14">
        <EmptyState
          icon={MapPinned}
          title={id ? 'Trip not found' : 'No trip on the map yet'}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/planner" className="btn-primary">Plan a trip</Link>
              <Link to="/explore" className="btn-secondary">Explore places</Link>
              {savedTrips.length > 0 && (
                <Link to="/trips" className="btn-secondary">Saved trips</Link>
              )}
            </div>
          }
        >
          {id
            ? 'This trip may have been deleted, or it was never saved on this device.'
            : 'Create an itinerary to see its route, stops and restaurants on the map.'}
        </EmptyState>
      </div>
    );
  }

  return <TripWorkspace key={trip.id} trip={trip} />;
}
