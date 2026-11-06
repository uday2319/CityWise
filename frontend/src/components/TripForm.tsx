import { useState, type FormEvent } from 'react';
import { Info, Minus, Plus, Sparkles } from 'lucide-react';
import type { ItineraryRequest } from '../types';
import { BUDGET_PRESETS, INTERESTS } from '../lib/catalog';
import { inr } from '../lib/format';
import CityInput from './CityInput';

const MIN_BUDGET = 500;
const MAX_BUDGET = 100000;
const MAX_DAYS = 14;              // matches ItineraryRequest.duration_days

const EXAMPLE_PROMPTS = [
  'I love ancient forts and local street food markets',
  'Peaceful nature spots and cozy cafes with a relaxed vibe',
  'Art galleries, colonial architecture, and fine dining',
];

// Mirrors BudgetAllocation.label() on the backend.
function budgetLabel(amount: number): string {
  if (amount < 1500) return 'Budget Traveller';
  if (amount < 3500) return 'Comfortable Travel';
  if (amount < 8000) return 'Premium Experience';
  return 'Luxury Travel';
}

function BudgetPreview({ budget }: { budget: number }) {
  const rows = [
    ['Attraction fee', `up to ${inr(budget * 0.25)}`],
    ['Lunch for two', `up to ${inr(budget * 0.4)}`],
    ['Dinner for two', `up to ${inr(budget * 0.5)}`],
    ['Local transport', inr(budget * 0.15)],
  ];

  return (
    <div className="mt-3 rounded-xl bg-forest-50 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-forest-800">
        <Info size={13} /> {budgetLabel(budget)}: how {inr(budget)} a day is used
      </p>
      <dl className="grid gap-y-1 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <dt className="text-ink-soft">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export interface TripFormValues {
  city?: string;
  days?: number;
  budget?: number;
  travellers?: number;
  interests?: string[];
  preference?: string;
}

interface Props {
  initial: TripFormValues;
  loading: boolean;
  onSubmit: (request: ItineraryRequest, travellers: number) => void;
}

export default function TripForm({ initial, loading, onSubmit }: Props) {
  const [city, setCity] = useState(initial.city ?? '');
  const [days, setDays] = useState(initial.days ?? 3);
  const [budgetInput, setBudgetInput] = useState(String(initial.budget ?? 3000));
  const [travellers, setTravellers] = useState(initial.travellers ?? 1);
  const [interests, setInterests] = useState<string[]>(initial.interests ?? []);
  const [preference, setPreference] = useState(initial.preference ?? '');

  const budget = Number(budgetInput) || 0;
  const budgetValid = budget >= MIN_BUDGET && budget <= MAX_BUDGET;

  // Interests join the free text, so the SBERT pipeline sees a single sentence.
  const chosen = INTERESTS.filter(interest => interests.includes(interest.key));
  const preferenceText = [
    preference.trim(),
    chosen.length ? `Interested in ${chosen.map(i => i.phrase).join(', ')}` : '',
  ].filter(Boolean).join('. ');

  const isValid =
    city.trim().length >= 2 && budgetValid && preferenceText.length >= 5;

  const toggleInterest = (key: string) =>
    setInterests(current =>
      current.includes(key)
        ? current.filter(item => item !== key)
        : [...current, key]
    );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) return;
    onSubmit(
      {
        city: city.trim(),
        duration_days: days,
        budget_per_day_inr: budget,
        preference_text: preferenceText,
      },
      travellers
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <CityInput value={city} onChange={setCity} required />

      <div className="space-y-5">
        <div>
          <label htmlFor="trip-days" className="label">
            Duration: {days} {days === 1 ? 'day' : 'days'}
          </label>
          <input
            id="trip-days"
            type="range"
            min={1}
            max={MAX_DAYS}
            value={days}
            onChange={event => setDays(Number(event.target.value))}
            className="w-full accent-[#164E3B]"
          />
          <div className="mt-0.5 flex justify-between text-xs text-ink-mute">
            <span>1</span>
            <span>{MAX_DAYS} days</span>
          </div>
        </div>

        <div>
          <span className="label" id="travellers-label">Travellers</span>
          <div className="flex items-center gap-3" role="group" aria-labelledby="travellers-label">
            <button
              type="button"
              aria-label="One fewer traveller"
              disabled={travellers <= 1}
              onClick={() => setTravellers(count => count - 1)}
              className="icon-btn border border-line bg-white hover:bg-forest-50"
            >
              <Minus size={16} />
            </button>
            <span className="w-6 text-center font-bold" aria-live="polite">{travellers}</span>
            <button
              type="button"
              aria-label="One more traveller"
              disabled={travellers >= 12}
              onClick={() => setTravellers(count => count + 1)}
              className="icon-btn border border-line bg-white hover:bg-forest-50"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="trip-budget" className="label">
          Daily budget per person (₹)
        </label>
        <input
          id="trip-budget"
          type="number"
          inputMode="numeric"
          min={MIN_BUDGET}
          max={MAX_BUDGET}
          step={100}
          value={budgetInput}
          onChange={event => setBudgetInput(event.target.value)}
          aria-invalid={!budgetValid}
          className="input"
        />
        <div className="mt-2.5 flex flex-wrap gap-2">
          {BUDGET_PRESETS.map(preset => (
            <button
              key={preset.value}
              type="button"
              aria-pressed={budget === preset.value}
              onClick={() => setBudgetInput(String(preset.value))}
              className={`chip ${budget === preset.value ? 'chip-active' : ''}`}
            >
              {preset.label} {preset.description}
            </button>
          ))}
        </div>
        {budgetValid ? (
          <BudgetPreview budget={budget} />
        ) : (
          <p className="mt-1.5 text-sm text-red-700">
            Enter a budget between ₹500 and ₹1,00,000.
          </p>
        )}
      </div>

      <fieldset>
        <legend className="label">Interests</legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              aria-pressed={interests.includes(key)}
              onClick={() => toggleInterest(key)}
              className={`chip ${interests.includes(key) ? 'chip-active' : ''}`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="trip-preference" className="label">
          Travel preferences
        </label>
        <textarea
          id="trip-preference"
          value={preference}
          onChange={event => setPreference(event.target.value)}
          rows={3}
          maxLength={300}
          placeholder="Describe the trip you want in your own words"
          className="input resize-none"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map(prompt => (
            <button
              key={prompt}
              type="button"
              onClick={() => setPreference(prompt)}
              className="rounded-lg bg-forest-50 px-2.5 py-1 text-left text-xs font-medium text-forest-800 hover:bg-forest-100"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !isValid}
        className="btn-primary w-full py-3.5 text-base"
      >
        <Sparkles size={18} />
        {loading ? 'Building your itinerary…' : 'Generate itinerary'}
      </button>
      {!isValid && !loading && (
        <p className="text-center text-sm text-ink-soft">
          Add a destination and pick an interest or describe your trip to continue.
        </p>
      )}
    </form>
  );
}
