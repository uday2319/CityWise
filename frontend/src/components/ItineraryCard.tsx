// frontend/src/components/ItineraryCard.tsx
import React from 'react';
import {
  Clock,
  MapPin,
  Star,
  IndianRupee,
  Utensils,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import type { DayItinerary } from '../types';

interface Props {
  day: DayItinerary;
  isActive: boolean;
  onSelect: () => void;
}

export default function ItineraryCard({ day, isActive, onSelect }: Props) {
  // Determine if this day went over the budget limit
  const isOverBudget = day.day_budget_actual > day.day_budget_limit;

  // Cap the bar width at 100% visually even if over budget
  const utilizationBarWidth = Math.min(day.budget_utilization_pct, 100);

  return (
    <div
      className={`card rounded-2xl overflow-hidden transition-all duration-300 ${
        isActive ? 'ring-1 ring-saffron-500' : ''
      }`}
    >
      {/* Day Header */}
      <button
        onClick={onSelect}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <span className="text-saffron-500 text-sm font-semibold">
            DAY {day.day}
          </span>
          <h3 className="text-white font-display text-lg mt-0.5 truncate">
            {day.title.replace(`Day ${day.day} — `, '')}
          </h3>

          {/* Summary row */}
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {day.attractions.length} stops
            </span>

            {/* v2: show day_budget_actual, not the old day_budget */}
            <span
              className={`flex items-center gap-1 ${
                isOverBudget ? 'text-red-400' : 'text-slate-400'
              }`}
            >
              {isOverBudget && <AlertCircle size={11} />}
              <IndianRupee size={11} />
              {Math.round(day.day_budget_actual).toLocaleString('en-IN')}
            </span>

            <span>{day.total_distance_km.toFixed(1)}km route</span>
          </div>

          {/* Budget utilization bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isOverBudget ? 'bg-red-500' : 'bg-saffron-500'
                }`}
                style={{ width: `${utilizationBarWidth}%` }}
              />
            </div>
            <span
              className={`text-xs flex-shrink-0 ${
                isOverBudget ? 'text-red-400' : 'text-slate-500'
              }`}
            >
              {Math.round(day.budget_utilization_pct)}%
            </span>
          </div>
        </div>

        <div className="ml-3 flex-shrink-0">
          {isActive ? (
            <ChevronUp size={20} className="text-slate-400" />
          ) : (
            <ChevronDown size={20} className="text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isActive && (
        <div className="px-5 pb-5 space-y-3">

          {/* Budget detail strip */}
          <div className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-2 text-xs">
            <span className="text-slate-400">Day budget</span>
            <div className="flex items-center gap-1.5">
              <span className={isOverBudget ? 'text-red-400 font-semibold' : 'text-white font-semibold'}>
                ₹{Math.round(day.day_budget_actual).toLocaleString('en-IN')}
              </span>
              <span className="text-slate-500">
                / ₹{Math.round(day.day_budget_limit).toLocaleString('en-IN')} limit
              </span>
              {isOverBudget && (
                <span className="text-red-400 ml-1">over budget</span>
              )}
            </div>
          </div>

          {/* Attraction Timeline */}
          <div className="relative">
            {day.attractions.map((attraction, idx) => (
              <div key={idx} className="flex gap-4 group">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  <div className="timeline-dot mt-1" />
                  {idx < day.attractions.length - 1 && (
                    <div className="timeline-line flex-1 mt-1 mb-1" />
                  )}
                </div>

                {/* Attraction content */}
                <div className="pb-4 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-saffron-500 text-xs font-mono">
                        {attraction.start_time}
                      </span>
                      <h4 className="text-white font-medium leading-tight mt-0.5">
                        {attraction.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                          {attraction.category}
                        </span>
                        <span className="flex items-center gap-0.5 text-xs text-slate-500">
                          <Clock size={10} />
                          {attraction.visit_duration_hours}h
                        </span>
                        <span className="flex items-center gap-0.5 text-xs text-slate-500">
                          <Star size={10} className="text-yellow-400" />
                          {attraction.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      {attraction.entrance_fee > 0 ? (
                        <span className="text-xs text-slate-400">
                          ₹{Math.round(attraction.entrance_fee)}
                        </span>
                      ) : (
                        <span className="text-xs text-teal-500">Free</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Meal recommendations */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700">
            {day.lunch && (
              <div className="bg-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-teal-500 text-xs font-semibold mb-1">
                  <Utensils size={12} />
                  LUNCH
                </div>
                <div className="text-white text-sm font-medium leading-tight">
                  {day.lunch.restaurant_name || 'Local Restaurant'}
                </div>
                <div className="text-slate-400 text-xs mt-0.5">
                  {day.lunch.cuisine?.split(',')[0] || 'Indian'} ·{' '}
                  ₹{Math.round((day.lunch.cost_for_two || 400) / 2)}/person
                </div>
              </div>
            )}
            {day.dinner && (
              <div className="bg-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-saffron-500 text-xs font-semibold mb-1">
                  <Utensils size={12} />
                  DINNER
                </div>
                <div className="text-white text-sm font-medium leading-tight">
                  {day.dinner.restaurant_name || 'Local Restaurant'}
                </div>
                <div className="text-slate-400 text-xs mt-0.5">
                  {day.dinner.cuisine?.split(',')[0] || 'Indian'} ·{' '}
                  ₹{Math.round((day.dinner.cost_for_two || 600) / 2)}/person
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}