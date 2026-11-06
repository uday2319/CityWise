import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Check, Loader2 } from 'lucide-react';
import TripForm from '../components/TripForm';
import { useProfile } from '../context/ProfileContext';
import { useTrips } from '../context/TripContext';
import { INTERESTS } from '../lib/catalog';
import type { ItineraryRequest } from '../types';

const PIPELINE = [
  'Finding real places in your destination',
  'Matching them to your preferences',
  'Ranking them against your budget',
  'Optimising each day’s route',
];

function numberParam(value: string | null): number | undefined {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export default function Planner() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { generate, generating } = useTrips();
  const { profile } = useProfile();

  const interest = params.get('interest');

  const initial = {
    city: params.get('city') ?? profile.homeCity,
    days: numberParam(params.get('days')),
    budget: numberParam(params.get('budget')),
    travellers: numberParam(params.get('travellers')),
    interests: INTERESTS.some(item => item.key === interest) ? [interest as string] : [],
    preference: profile.travelStyle,
  };

  const handleSubmit = async (request: ItineraryRequest, travellers: number) => {
    const trip = await generate({ request, travellers });
    if (trip) {
      toast.success('Your itinerary is ready');
      navigate(`/trip/${trip.id}`);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <h1 className="text-3xl font-extrabold">AI Trip Planner</h1>
        <p className="mt-1 text-ink-soft">
          Tell us about your trip and CityWise will build a day-by-day plan.
        </p>
        <div className="card mt-5 p-5 sm:p-6">
          <TripForm initial={initial} loading={generating} onSubmit={handleSubmit} />
        </div>
      </div>

      <aside className="lg:pt-[92px]">
        <div className="card sticky top-20 p-5" aria-live="polite">
          <h2 className="font-bold">
            {generating ? 'Building your itinerary' : 'How your plan is made'}
          </h2>
          {generating && (
            <p className="mt-1 text-sm text-ink-soft">
              This usually takes under a minute. Longer trips take more time.
            </p>
          )}
          <ol className="mt-3 space-y-2.5">
            {PIPELINE.map(step => (
              <li key={step} className="flex items-start gap-2.5 text-sm text-ink-soft">
                {generating ? (
                  <Loader2 size={16} className="mt-0.5 flex-shrink-0 animate-spin text-teal-600" />
                ) : (
                  <Check size={16} className="mt-0.5 flex-shrink-0 text-teal-600" />
                )}
                {step}
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
