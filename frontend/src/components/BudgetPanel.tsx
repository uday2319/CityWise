import { CheckCircle, AlertCircle, MapPin, Navigation, TrendingUp, Utensils } from 'lucide-react';
import type { ItineraryResponse } from '../types';
import { inr, mealCost } from '../lib/format';

export default function BudgetPanel({
  itinerary,
  travellers,
}: {
  itinerary: ItineraryResponse;
  travellers: number;
}) {
  const alloc = itinerary.budget_allocation;
  const totalActual = itinerary.total_budget_actual;
  const totalLimit = itinerary.total_budget_limit;
  const overBudget = totalActual > totalLimit;
  const utilPct = totalLimit > 0 ? Math.round((totalActual / totalLimit) * 100) : 0;

  const stops = itinerary.days.flatMap(day => day.attractions);
  const meals = itinerary.days.flatMap(day => [day.lunch, day.dinner]);

  const attrCosts = stops.reduce((sum, a) => sum + (a.entrance_fee || 0), 0);
  const foodCosts = meals.reduce((sum, meal) => sum + (mealCost(meal) ?? 0), 0);
  const transportCosts = alloc.transport_allocation_inr * itinerary.duration_days;

  const feesUnknown = stops.some(a => a.placeholder_metrics);
  const foodEstimated = meals.some(meal => meal?.cost_is_estimate);

  const lineItems = [
    { label: 'Attractions', note: feesUnknown ? 'fees not listed' : '', value: attrCosts, icon: <MapPin size={15} />, bar: 'bg-forest-800' },
    { label: 'Food and dining', note: foodEstimated ? 'estimated' : '', value: foodCosts, icon: <Utensils size={15} />, bar: 'bg-ember-500' },
    { label: 'Local transport', note: 'allowance', value: transportCosts, icon: <Navigation size={15} />, bar: 'bg-teal-500' },
  ];

  return (
    <section aria-label="Budget breakdown" className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <TrendingUp size={18} className="text-forest-500" />
          Budget breakdown
        </h2>
        <span className={`flex items-center gap-1.5 text-sm font-semibold ${overBudget ? 'text-red-700' : 'text-forest-700'}`}>
          {overBudget ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
          {overBudget ? 'Over budget' : 'Within budget'}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Per person for the whole trip · {itinerary.budget_label}. Accommodation is not included.
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Estimated', value: inr(totalActual) },
              { label: 'Daily average', value: inr(totalActual / itinerary.duration_days) },
              { label: 'Budget used', value: `${utilPct}%` },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl bg-canvas p-3 text-center">
                <div className="text-lg font-extrabold">{stat.value}</div>
                <div className="text-xs text-ink-soft">{stat.label}</div>
              </div>
            ))}
          </div>

          <div
            className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-forest-50"
            role="img"
            aria-label="Share of spending by category"
          >
            {lineItems.map(item => (
              <div
                key={item.label}
                className={item.bar}
                style={{ width: `${totalActual > 0 ? (item.value / totalActual) * 100 : 0}%` }}
              />
            ))}
          </div>

          <ul className="mt-3 space-y-2">
            {lineItems.map(item => (
              <li key={item.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink-soft">
                  {item.icon} {item.label}
                  {item.note && <span className="text-xs text-ink-mute">({item.note})</span>}
                </span>
                <span className="font-semibold">
                  {item.value === 0 && item.note === 'fees not listed' ? 'Not listed' : inr(item.value)}
                </span>
              </li>
            ))}
          </ul>

          {travellers > 1 && (
            <p className="mt-3 border-t border-line pt-3 text-sm font-semibold">
              {travellers} travellers: {inr(totalActual * travellers)} in total
            </p>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold">Each day against your limit</h3>
          <ul className="max-h-56 space-y-3 overflow-y-auto pr-1">
            {itinerary.days.map(day => {
              const over = day.day_budget_actual > day.day_budget_limit;
              return (
                <li key={day.day}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold text-ink-soft">Day {day.day}</span>
                    <span className="text-ink-soft">
                      {inr(day.day_budget_actual)} of {inr(day.day_budget_limit)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-forest-50">
                    <div
                      className={`h-full rounded-full ${over ? 'bg-red-600' : 'bg-forest-800'}`}
                      style={{ width: `${Math.min(day.budget_utilization_pct, 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {(feesUnknown || foodEstimated) && (
        <p className="mt-4 rounded-xl bg-ember-50 px-3.5 py-2.5 text-sm text-ink">
          {feesUnknown && 'Entrance fees are not available for these places, so they are not counted. '}
          {foodEstimated && 'Meal prices are CityWise estimates, not restaurant prices. '}
          Allow extra for these.
        </p>
      )}
    </section>
  );
}
