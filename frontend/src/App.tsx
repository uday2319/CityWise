import React, { useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
} from '@tanstack/react-query';
import { Toaster, toast } from 'react-hot-toast';
import TripForm from './components/TripForm';
import ItineraryCard from './components/ItineraryCard';
import ItineraryMap from './components/ItineraryMap';
import BudgetPanel from './components/BudgetPanel';
import { itineraApi } from './api/itineraApi';
import type { ItineraryRequest, ItineraryResponse } from './types';

const queryClient = new QueryClient();

function ItineraApp() {
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [activeDay, setActiveDay] = useState(1);

  const generateMutation = useMutation({
    mutationFn: (req: ItineraryRequest) => itineraApi.generateItinerary(req),
    onSuccess: data => {
      setItinerary(data);
      setActiveDay(1);
      toast.success('Your itinerary is ready! ✈️');
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.detail || 'Failed to generate itinerary';
      toast.error(msg);
    },
  });

  return (
    <div className="min-h-screen gradient-hero">

      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✈️</span>
            <div>
              <h1 className="font-display text-2xl text-white font-bold">
                Itinera
              </h1>
              <p className="text-xs text-slate-400">AI Travel Planner</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            ML Pipeline Active
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!itinerary ? (

          // ── Landing / Form view ─────────────────────────────────────────
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-display text-4xl text-white font-bold mb-3">
                Plan Your Perfect<br />
                <span className="text-saffron-500">Indian Adventure</span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                AI-powered itineraries using Sentence-BERT semantic search,<br />
                XGBoost LTR ranking, and OR-Tools route optimization
              </p>
            </div>

            <div className="card rounded-2xl p-6">
              <TripForm
                onSubmit={generateMutation.mutate}
                loading={generateMutation.isPending}
              />
            </div>

            {/* Tech stack */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {[
                'Sentence-BERT',
                'FAISS',
                'XGBRanker',
                'OR-Tools',
                'FastAPI',
                'React',
                'pgvector',
              ].map(tech => (
                <span
                  key={tech}
                  className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-400 border border-slate-700"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

        ) : (

          // ── Itinerary result view ───────────────────────────────────────
          <div className="space-y-6">

            {/* Results header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setItinerary(null)}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
              >
                ← New Trip
              </button>

              <div className="text-center">
                <h2 className="font-display text-2xl text-white">
                  {itinerary.duration_days} Days in {itinerary.city}
                </h2>
                {/* Show user's original preference text */}
                <p className="text-slate-400 text-sm max-w-md mx-auto leading-snug mt-0.5">
                  "
                  {itinerary.preference_text.length > 60
                    ? itinerary.preference_text.slice(0, 57) + '...'
                    : itinerary.preference_text}
                  "
                </p>
              </div>

              {/* Budget summary in header — numeric, not label */}
              <div className="text-right">
                <div className="text-saffron-500 font-bold text-lg">
                  ₹{itinerary.budget_per_day_inr.toLocaleString('en-IN')}
                  <span className="text-slate-400 text-xs font-normal">/day</span>
                </div>
                <div className="text-slate-400 text-xs">
                  {itinerary.budget_label}
                </div>
                <div className="text-slate-500 text-xs mt-0.5">
                  Total: ₹{Math.round(itinerary.total_budget_actual).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left: Day cards */}
              <div className="lg:col-span-1 space-y-3">
                {itinerary.days.map(day => (
                  <ItineraryCard
                    key={day.day}
                    day={day}
                    isActive={activeDay === day.day}
                    onSelect={() =>
                      setActiveDay(activeDay === day.day ? 0 : day.day)
                    }
                  />
                ))}
              </div>

              {/* Right: Map + Budget */}
              <div className="lg:col-span-2 space-y-6">
                {/* Day selector tabs */}
                <div className="flex gap-2 overflow-x-auto">
                  {itinerary.days.map(day => (
                    <button
                      key={day.day}
                      onClick={() => setActiveDay(day.day)}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        activeDay === day.day
                          ? 'bg-saffron-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      Day {day.day}
                    </button>
                  ))}
                </div>

                <ItineraryMap days={itinerary.days} activeDay={activeDay || 1} />
                <BudgetPanel itinerary={itinerary} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ItineraApp />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid rgba(148,163,184,0.1)',
          },
        }}
      />
    </QueryClientProvider>
  );
}