import React, { useState, useCallback } from 'react';
import {
  MapPin,
  Calendar,
  IndianRupee,
  MessageSquare,
  Info,
} from 'lucide-react';
import type { ItineraryRequest } from '../types';

// ── Budget preset chips ────────────────────────────────────────────────────
interface BudgetPreset {
  label: string;
  value: number;
  description: string;
}

const BUDGET_PRESETS: BudgetPreset[] = [
  { label: '₹1,000',  value: 1000,  description: 'Backpacker' },
  { label: '₹2,000',  value: 2000,  description: 'Budget' },
  { label: '₹3,500',  value: 3500,  description: 'Comfortable' },
  { label: '₹6,000',  value: 6000,  description: 'Premium' },
  { label: '₹10,000', value: 10000, description: 'Luxury' },
];

// ── Example preference prompts ────────────────────────────────────────────
const EXAMPLE_PROMPTS = [
  'I love ancient forts and local street food markets',
  'Peaceful nature spots and cozy cafes with a relaxed vibe',
  'Historical monuments and cultural experiences, vegetarian food',
  'Adventure activities, scenic viewpoints, and wildlife',
  'Spiritual temples and traditional bazaars for shopping',
  'Art galleries, colonial architecture, and fine dining',
];

const POPULAR_CITIES = [
  'Delhi', 'Mumbai', 'Jaipur', 'Goa',
  'Agra', 'Varanasi', 'Udaipur', 'Bangalore',
];

// ── Budget label helper (mirrors BudgetAllocation.label() on backend) ─────
function getBudgetLabel(amount: number): string {
  if (amount < 1500) return 'Budget Traveller';
  if (amount < 3500) return 'Comfortable Travel';
  if (amount < 8000) return 'Premium Experience';
  return 'Luxury Travel';
}

// ── Budget allocation preview ─────────────────────────────────────────────
function BudgetPreview({ budget }: { budget: number }) {
  if (budget <= 0) return null;

  const maxFee     = Math.round(budget * 0.25);
  const maxLunch   = Math.round(budget * 0.40);
  const maxDinner  = Math.round(budget * 0.50);
  const transport  = Math.round(budget * 0.15);
  const label      = getBudgetLabel(budget);

  return (
    <div className="mt-3 bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-1.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Info size={12} className="text-teal-400" />
        <span className="text-xs text-teal-400 font-semibold">
          {label} — Budget breakdown for ₹{budget.toLocaleString('en-IN')}/day
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Max attraction fee</span>
          <span className="text-white font-medium">≤ ₹{maxFee.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Max lunch (for 2)</span>
          <span className="text-white font-medium">≤ ₹{maxLunch.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Max dinner (for 2)</span>
          <span className="text-white font-medium">≤ ₹{maxDinner.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Transport buffer</span>
          <span className="text-white font-medium">₹{transport.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}

interface Props {
  onSubmit: (req: ItineraryRequest) => void;
  loading: boolean;
}

export default function TripForm({ onSubmit, loading }: Props) {
  const [city, setCity]                     = useState('');
  const [days, setDays]                     = useState(3);
  const [budgetPerDay, setBudgetPerDay]     = useState<number>(3000);
  const [budgetInput, setBudgetInput]       = useState<string>('3000');
  const [preferenceText, setPreferenceText] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchCitySuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setCitySuggestions([]); return; }
    try {
      const res  = await fetch(
        `http://localhost:8000/api/v1/cities/search?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      setCitySuggestions(data.cities || []);
      setShowSuggestions(true);
    } catch {
      setCitySuggestions([]);
    }
  }, []);

  const handleBudgetInput = (raw: string) => {
    setBudgetInput(raw);
    const parsed = parseFloat(raw.replace(/,/g, ''));
    if (!isNaN(parsed) && parsed > 0) {
      setBudgetPerDay(parsed);
    }
  };

  const handlePresetClick = (value: number) => {
    setBudgetPerDay(value);
    setBudgetInput(String(value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!city || preferenceText.trim().length < 5 || budgetPerDay < 500) return;
    onSubmit({
      city,
      duration_days: days,
      budget_per_day_inr: budgetPerDay,
      preference_text: preferenceText.trim(),
    });
  };

  const charCount = preferenceText.length;
  const isValid   =
    city.trim().length >= 2 &&
    preferenceText.trim().length >= 5 &&
    budgetPerDay >= 500;

  return (
    <form onSubmit={handleSubmit} className="space-y-7">

      {/* ── City Input ──────────────────────────────────────────────────── */}
      <div className="relative">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
          <MapPin size={16} className="text-saffron-500" />
          Destination City
        </label>
        <input
          type="text"
          value={city}
          onChange={e => {
            setCity(e.target.value);
            fetchCitySuggestions(e.target.value);
          }}
          onFocus={() => city.length > 1 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="e.g. Delhi, Jaipur, Mumbai..."
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-saffron-500 transition-colors"
          required
        />
        {showSuggestions && citySuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl">
            {citySuggestions.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => { setCity(c); setShowSuggestions(false); }}
                className="w-full px-4 py-2.5 text-left text-slate-300 hover:bg-slate-700 first:rounded-t-xl last:rounded-b-xl transition-colors"
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          {POPULAR_CITIES.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCity(c)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                city === c
                  ? 'bg-saffron-500/20 border-saffron-500 text-saffron-400'
                  : 'border-slate-600 text-slate-400 hover:border-slate-400'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Duration ────────────────────────────────────────────────────── */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
          <Calendar size={16} className="text-saffron-500" />
          Duration:{' '}
          <span className="text-white font-semibold ml-1">
            {days} {days === 1 ? 'day' : 'days'}
          </span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="w-full accent-orange-500"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>1 day</span>
          <span>5 days</span>
          <span>10 days</span>
        </div>
      </div>

      {/* ── Budget Per Day — NUMERIC INR INPUT (v2 change) ─────────────── */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
          <IndianRupee size={16} className="text-saffron-500" />
          Daily Budget
          <span className="text-slate-600 text-xs font-normal ml-1">
            (per person per day, in ₹ INR)
          </span>
        </label>

        {/* Numeric text input */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium select-none">
            ₹
          </span>
          <input
            type="number"
            min={500}
            max={100000}
            step={100}
            value={budgetInput}
            onChange={e => handleBudgetInput(e.target.value)}
            placeholder="3000"
            className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-8 pr-20 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-saffron-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            required
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">
            per day
          </span>
        </div>

        {/* Quick preset chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          {BUDGET_PRESETS.map(preset => (
            <button
              key={preset.value}
              type="button"
              onClick={() => handlePresetClick(preset.value)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all flex flex-col items-center ${
                budgetPerDay === preset.value
                  ? 'border-saffron-500 bg-saffron-500/10 text-saffron-400'
                  : 'border-slate-600 text-slate-400 hover:border-slate-400'
              }`}
            >
              <span className="font-semibold">{preset.label}</span>
              <span className="text-slate-500 text-[10px]">{preset.description}</span>
            </button>
          ))}
        </div>

        {/* Live allocation preview */}
        {budgetPerDay >= 500 && (
          <BudgetPreview budget={budgetPerDay} />
        )}

        {budgetPerDay < 500 && budgetInput !== '' && (
          <p className="text-red-400 text-xs mt-1.5">
            Minimum daily budget is ₹500
          </p>
        )}
      </div>
      {/* ── End budget section ─────────────────────────────────────────── */}

      {/* ── Natural Language Preference (unchanged from v1) ────────────── */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
          <MessageSquare size={16} className="text-saffron-500" />
          Describe Your Travel Style
          <span className="text-slate-600 text-xs font-normal">
            (AI will understand your preferences)
          </span>
        </label>

        <textarea
          value={preferenceText}
          onChange={e => setPreferenceText(e.target.value)}
          placeholder={
            `Describe what you enjoy...\n` +
            `e.g. "I love ancient forts and local street food" or ` +
            `"Peaceful nature spots and cozy cafes"`
          }
          rows={3}
          maxLength={500}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-saffron-500 transition-colors resize-none"
          required
        />

        <div className="flex items-center justify-between mt-1.5">
          <span
            className={`text-xs ${
              charCount < 5 ? 'text-red-400' : 'text-slate-500'
            }`}
          >
            {charCount < 5
              ? `${5 - charCount} more characters needed`
              : '✓ AI will encode this with Sentence-BERT'}
          </span>
          <span className="text-xs text-slate-600">{charCount}/500</span>
        </div>

        {/* Example prompt chips */}
        <div className="mt-3">
          <p className="text-xs text-slate-500 mb-2">Try an example:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPreferenceText(prompt)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors text-left ${
                  preferenceText === prompt
                    ? 'bg-teal-500/20 border-teal-500 text-teal-400'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }`}
              >
                "{prompt.length > 45 ? prompt.slice(0, 42) + '...' : prompt}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={loading || !isValid}
        className="w-full btn-primary py-4 rounded-xl text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            Encoding preferences with SBERT...
          </>
        ) : (
          <>✈️ Generate AI Itinerary</>
        )}
      </button>

      {/* Pipeline explanation */}
      <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          Your text →{' '}
          <span className="text-teal-400">Sentence-BERT</span> → 384-dim vector →{' '}
          <span className="text-teal-400">FAISS</span> semantic search →{' '}
          ₹{budgetPerDay.toLocaleString('en-IN')}/day filter →{' '}
          <span className="text-teal-400">XGBoost</span> ranker →{' '}
          <span className="text-teal-400">OR-Tools</span> route → Itinerary
        </p>
      </div>
    </form>
  );
}