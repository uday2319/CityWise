import type { Trip } from '../types';
import { buildTimeline, feeLabel, inr, mealCost } from './format';

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

export function tripToText(trip: Trip): string {
  const { itinerary, travellers } = trip;
  const lines: string[] = [
    `CITYWISE ITINERARY: ${trip.name}`,
    `${itinerary.duration_days} days in ${itinerary.city}`,
    ...(trip.startDate ? [`Starting: ${trip.startDate}`] : []),
    `Travellers: ${travellers}`,
    `Daily budget: ${inr(itinerary.budget_per_day_inr)} per person (${itinerary.budget_label})`,
    `Estimated total: ${inr(itinerary.total_budget_actual * travellers)} for ${travellers} (excludes accommodation)`,
    `Preferences: ${itinerary.preference_text}`,
  ];

  const hotel = itinerary.days.find(day => day.hotel)?.hotel;
  if (hotel) lines.push(`Suggested stay: ${hotel.name}${hotel.area ? `, ${hotel.area}` : ''}`);

  for (const day of itinerary.days) {
    lines.push('', `DAY ${day.day}`, `Estimated cost ${inr(day.day_budget_actual)} per person.`);

    for (const [part, items] of buildTimeline(day)) {
      lines.push('', `  ${part}`);
      for (const item of items) {
        if (item.kind === 'stop') {
          const a = item.attraction;
          const when = a.start_time ? `${a.start_time}-${a.end_time}` : 'Flexible';
          lines.push(
            `  ${when}  ${a.name} (${a.category}, ${a.visit_duration_hours} h, ${feeLabel(a)})`
          );
        } else if (item.kind === 'hotel') {
          lines.push(`  ${item.time}  ${item.leaving ? 'Leave' : 'Return to'} ${item.hotel.name}`);
        } else {
          const cost = mealCost(item.meal);
          const price = cost
            ? `${item.meal.cost_is_estimate ? 'about ' : ''}${inr(cost)} per person`
            : 'price not listed';
          lines.push(`  ${item.time}  ${MEAL_LABELS[item.kind]}: ${item.meal.restaurant_name} (${price})`);
        }
      }
    }
  }

  lines.push('', 'Times and costs are estimates. Check opening hours before you travel.');
  return lines.join('\n');
}

export function downloadTrip(trip: Trip): void {
  const blob = new Blob([tripToText(trip)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${trip.name.replace(/[^\w-]+/g, '-').toLowerCase()}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
