import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Briefcase, CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { Dialog, EmptyState, PlaceImage } from '../components/ui';
import { useTrips } from '../context/TripContext';
import { inr, tripProgress } from '../lib/format';
import type { Trip } from '../types';

function today(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function endDate(trip: Trip): string | null {
  if (!trip.startDate) return null;
  const date = new Date(`${trip.startDate}T00:00:00`);
  date.setDate(date.getDate() + trip.itinerary.duration_days - 1);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function EditTrip({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { updateTrip } = useTrips();
  const [name, setName] = useState(trip.name);
  const [startDate, setStartDate] = useState(trip.startDate ?? '');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    updateTrip(trip.id, {
      name: name.trim() || trip.name,
      startDate: startDate || undefined,
    });
    toast.success('Trip updated');
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="edit-name" className="label">Trip name</label>
        <input
          id="edit-name"
          className="input"
          value={name}
          maxLength={80}
          onChange={event => setName(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="edit-date" className="label">Start date</label>
        <input
          id="edit-date"
          type="date"
          className="input"
          value={startDate}
          onChange={event => setStartDate(event.target.value)}
        />
      </div>
      <button type="submit" className="btn-primary w-full">Save changes</button>
    </form>
  );
}

function TripCard({ trip, onEdit }: { trip: Trip; onEdit: () => void }) {
  const { deleteTrip, showTrip } = useTrips();
  const [confirming, setConfirming] = useState(false);
  const { itinerary } = trip;
  const progress = tripProgress(trip);

  return (
    <li className="card flex flex-col overflow-hidden">
      <PlaceImage
        query={itinerary.days[0]?.attractions[0]?.name ?? itinerary.city}
        context={itinerary.city}
        width={640}
        alt={itinerary.city}
        className="h-36 w-full"
      />
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-bold">{trip.name}</h3>
        <p className="text-sm text-ink-soft">
          {trip.startDate ? `From ${trip.startDate} · ` : ''}
          {trip.travellers} {trip.travellers === 1 ? 'traveller' : 'travellers'} ·{' '}
          {inr(itinerary.total_budget_actual * trip.travellers)}
        </p>
        <p className="mt-1 text-xs font-semibold text-forest-500">{progress}% visited</p>

        <div className="mt-auto pt-3">
          {confirming ? (
            <div className="flex items-center gap-2" role="group" aria-label="Confirm deletion">
              <span className="flex-1 text-sm font-semibold">Delete this trip?</span>
              <button type="button" onClick={() => deleteTrip(trip.id)} className="btn-danger px-3 py-2">
                Delete
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="btn-secondary px-3 py-2">
                Keep
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link
                to={`/trip/${trip.id}`}
                onClick={() => showTrip(trip)}
                className="btn-primary flex-1"
              >
                View itinerary
              </Link>
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit ${trip.name}`}
                className="btn-secondary px-3"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label={`Delete ${trip.name}`}
                className="btn-secondary px-3"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export default function Trips() {
  const { savedTrips } = useTrips();
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = savedTrips.find(trip => trip.id === editingId) ?? null;
  const now = today();

  const groups = [
    {
      title: 'Upcoming trips',
      trips: savedTrips
        .filter(trip => (endDate(trip) ?? '') >= now)
        .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? '')),
    },
    { title: 'Saved itineraries', trips: savedTrips.filter(trip => !trip.startDate) },
    {
      title: 'Previous trips',
      trips: savedTrips
        .filter(trip => trip.startDate && (endDate(trip) ?? '') < now)
        .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? '')),
    },
  ].filter(group => group.trips.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">My Trips</h1>
          <p className="mt-1 text-ink-soft">
            Saved on this device. Add a start date to sort a trip into upcoming or previous.
          </p>
        </div>
        <Link to="/planner" className="btn-primary">Plan a new trip</Link>
      </div>

      {groups.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title="No saved trips yet"
          action={<Link to="/planner" className="btn-primary">Plan a trip</Link>}
        >
          Generate an itinerary and press Save to keep it here.
        </EmptyState>
      )}

      <div className="space-y-10">
        {groups.map(group => (
          <section key={group.title}>
            <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
              <CalendarDays size={19} className="text-forest-500" />
              {group.title}
            </h2>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.trips.map(trip => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onEdit={() => setEditingId(trip.id)}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Dialog open={editing !== null} title="Edit trip" onClose={() => setEditingId(null)}>
        {editing && <EditTrip key={editing.id} trip={editing} onClose={() => setEditingId(null)} />}
      </Dialog>
    </div>
  );
}
