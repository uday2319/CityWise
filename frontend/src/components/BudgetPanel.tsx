import React from 'react';
import {
  IndianRupee,
  TrendingUp,
  Utensils,
  MapPin,
  Navigation,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type { ItineraryResponse } from '../types';

interface Props {
  itinerary: ItineraryResponse;
}

export default function BudgetPanel({ itinerary }: Props) {
  const alloc = itinerary.budget_allocation;
  const totalActual = itinerary.total_budget_actual;
  const totalLimit  = itinerary.total_budget_limit;
  const overBudget  = totalActual > totalLimit;
  const utilPct     = totalLimit > 0
    ? Math.round((totalActual / totalLimit) * 100)
    : 0;

  // Compute breakdown from days
  const attrCosts = itinerary.days.reduce(
    (sum, day) =>
      sum + day.attractions.reduce((s, a) => s + (a.entrance_fee || 0), 0),
    0
  );
  const foodCosts = itinerary.days.reduce((sum, day) => {
    const l = (day.lunch?.cost_for_two || 400) / 2;
    const d = (day.dinner?.cost_for_two || 600) / 2;
    return sum + l + d;
  }, 0);
  const transportCosts = alloc.transport_allocation_inr * itinerary.duration_days;

  const lineItems = [
    {
      label: 'Attractions',
      value: attrCosts,
      icon: <MapPin size={14} />,
      color: 'text-saffron-500',
      bar: 'bg-saffron-500',
    },
    {
      label: 'Food & Dining',
      value: foodCosts,
      icon: <Utensils size={14} />,
      color: 'text-teal-500',
      bar: 'bg-teal-500',
    },
    {
      label: 'Transport',
      value: transportCosts,
      icon: <Navigation size={14} />,
      color: 'text-purple-400',
      bar: 'bg-purple-400',
    },
  ];

  return (
    <div className="card rounded-2xl p-5 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <TrendingUp size={16} className="text-saffron-500" />
          Budget Summary
        </h3>
        <div className="flex items-center gap-1.5">
          {overBudget ? (
            <AlertCircle size={14} className="text-red-400" />
          ) : (
            <CheckCircle size={14} className="text-green-400" />
          )}
          <span
            className={`text-xs font-medium ${
              overBudget ? 'text-red-400' : 'text-green-400'
            }`}
          >
            {overBudget ? 'Over budget' : 'Within budget'}
          </span>
        </div>
      </div>

      {/* Budget tier label */}
      <div className="bg-slate-800 rounded-xl px-4 py-2 flex items-center justify-between">
        <span className="text-slate-400 text-sm">Your budget</span>
        <div className="text-right">
          <span className="text-white font-bold text-lg">
            ₹{itinerary.budget_per_day_inr.toLocaleString('en-IN')}
          </span>
          <span className="text-slate-400 text-xs ml-1">/day</span>
          <div className="text-xs text-saffron-400 mt-0.5">
            {itinerary.budget_label}
          </div>
        </div>
      </div>

      {/* Budget allocation breakdown (from schema) */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 space-y-1.5">
        <div className="text-xs text-slate-500 font-medium mb-2">
          Allocation per day
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Max attraction fee</span>
            <span className="text-white">
              ≤ ₹{alloc.max_entrance_fee_inr.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Max lunch (2 pax)</span>
            <span className="text-white">
              ≤ ₹{alloc.max_lunch_cost_for_two_inr.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Max dinner (2 pax)</span>
            <span className="text-white">
              ≤ ₹{alloc.max_dinner_cost_for_two_inr.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Transport buffer</span>
            <span className="text-white">
              ₹{alloc.transport_allocation_inr.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-white">
            ₹{Math.round(totalActual).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Total Actual</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-white">
            ₹{Math.round(totalActual / itinerary.duration_days).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Daily Average</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <div
            className={`text-xl font-bold ${
              overBudget ? 'text-red-400' : 'text-green-400'
            }`}
          >
            {utilPct}%
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Used</div>
        </div>
      </div>

      {/* Overall utilization bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>₹0</span>
          <span>Budget: ₹{Math.round(totalLimit).toLocaleString('en-IN')}</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              overBudget ? 'bg-red-500' : 'bg-saffron-500'
            }`}
            style={{ width: `${Math.min(utilPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Category breakdown */}
      <div>
        <div className="h-2 rounded-full flex overflow-hidden mb-3">
          {lineItems.map((item, i) => (
            <div
              key={i}
              className={`${item.bar} transition-all`}
              style={{
                width: `${
                  totalActual > 0 ? (item.value / totalActual) * 100 : 33
                }%`,
              }}
            />
          ))}
        </div>
        <div className="space-y-2">
          {lineItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div
                className={`flex items-center gap-2 text-sm ${item.color}`}
              >
                {item.icon}
                <span className="text-slate-300">{item.label}</span>
              </div>
              <span className="text-sm text-white">
                ₹{Math.round(item.value).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-day breakdown with utilization bars */}
      <div className="pt-3 border-t border-slate-700">
        <div className="text-xs text-slate-400 mb-3">
          Per Day — Actual vs Limit
        </div>
        <div className="space-y-2.5">
          {itinerary.days.map(day => {
            const pct = Math.min(day.budget_utilization_pct, 100);
            const over = day.day_budget_actual > day.day_budget_limit;
            return (
              <div key={day.day}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-slate-500">Day {day.day}</span>
                  <span className="text-xs text-slate-300">
                    ₹{Math.round(day.day_budget_actual).toLocaleString('en-IN')}
                    {' '}
                    <span className="text-slate-500">
                      / ₹{Math.round(day.day_budget_limit).toLocaleString('en-IN')}
                    </span>
                  </span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      over ? 'bg-red-500' : 'bg-saffron-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}