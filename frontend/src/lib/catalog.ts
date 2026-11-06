import {
  Compass,
  Landmark,
  Mountain,
  Palette,
  Sparkles,
  TreePine,
  Waves,
  type LucideIcon,
} from 'lucide-react';

export interface Destination {
  city: string;
  country: string;
  region: string;
  query: string;               // city name sent to the backend
  blurb: string;
  latitude: number;
  longitude: number;
  photos: string[];            // Wikipedia pages; the first is the cover
  tags: string[];              // interest keys
  foods: string[];             // Wikipedia pages for local dishes
}

export const DESTINATIONS: Destination[] = [
  {
    city: 'Jaipur', country: 'India', region: 'Rajasthan', query: 'Jaipur',
    blurb: 'Pink sandstone palaces, hilltop forts and lively bazaars.',
    latitude: 26.9124, longitude: 75.7873,
    photos: ['Hawa Mahal', 'Amber Fort', 'Jal Mahal'],
    tags: ['history', 'culture'], foods: ['Dal bati', 'Ghevar', 'Laal maas'],
  },
  {
    city: 'Udaipur', country: 'India', region: 'Rajasthan', query: 'Udaipur',
    blurb: 'Lakeside palaces framed by the Aravalli hills.',
    latitude: 24.5854, longitude: 73.7125,
    photos: ['Lake Pichola', 'City Palace, Udaipur', 'Jag Mandir'],
    tags: ['nature', 'history'], foods: ['Dal bati', 'Rajasthani cuisine'],
  },
  {
    city: 'Agra', country: 'India', region: 'Uttar Pradesh', query: 'Agra',
    blurb: 'Home of the Taj Mahal and Mughal-era monuments.',
    latitude: 27.1767, longitude: 78.0081,
    photos: ['Taj Mahal', 'Agra Fort', 'Fatehpur Sikri'],
    tags: ['history', 'culture'], foods: ['Petha', 'Mughlai cuisine'],
  },
  {
    city: 'Goa', country: 'India', region: 'Goa', query: 'Goa',
    blurb: 'Long beaches, Portuguese churches and coastal food.',
    latitude: 15.2993, longitude: 74.124,
    photos: ['Palolem', 'Basilica of Bom Jesus', 'Dudhsagar Falls'],
    tags: ['beaches', 'nature'], foods: ['Vindaloo', 'Bebinca'],
  },
  {
    city: 'Varanasi', country: 'India', region: 'Uttar Pradesh', query: 'Varanasi',
    blurb: 'Ancient ghats and evening rituals on the Ganges.',
    latitude: 25.3176, longitude: 82.9739,
    photos: ['Dashashwamedh Ghat', 'Kashi Vishwanath Temple', 'Sarnath'],
    tags: ['religious', 'culture'], foods: ['Lassi', 'Kachori'],
  },
  {
    city: 'Delhi', country: 'India', region: 'Delhi', query: 'Delhi',
    blurb: 'Centuries of history alongside a modern capital.',
    latitude: 28.6139, longitude: 77.209,
    photos: ['India Gate', 'Red Fort', 'Qutb Minar'],
    tags: ['history', 'culture'], foods: ['Butter chicken', 'Chole bhature'],
  },
  {
    city: 'Mumbai', country: 'India', region: 'Maharashtra', query: 'Mumbai',
    blurb: 'Colonial landmarks, sea views and street food.',
    latitude: 19.076, longitude: 72.8777,
    photos: ['Gateway of India', 'Marine Drive, Mumbai', 'Elephanta Caves'],
    tags: ['culture', 'beaches'], foods: ['Vada pav', 'Pav bhaji'],
  },
  {
    city: 'Mysore', country: 'India', region: 'Karnataka', query: 'Mysore',
    blurb: 'A royal city of palaces, silk and sandalwood.',
    latitude: 12.2958, longitude: 76.6394,
    photos: ['Mysore Palace', 'Chamundeshwari Temple', 'Brindavan Gardens'],
    tags: ['history', 'religious'], foods: ['Mysore pak', 'Masala dosa'],
  },
  {
    city: 'Hampi', country: 'India', region: 'Karnataka', query: 'Hampi',
    blurb: 'Temple ruins of the Vijayanagara capital, among giant boulders.',
    latitude: 15.335, longitude: 76.46,
    photos: ['Hampi', 'Virupaksha Temple, Hampi'],
    tags: ['history', 'adventure'], foods: ['Masala dosa', 'Idli'],
  },
  {
    city: 'Munnar', country: 'India', region: 'Kerala', query: 'Munnar',
    blurb: 'Rolling tea estates and cool air high in the Western Ghats.',
    latitude: 10.0889, longitude: 77.0595,
    photos: ['Munnar', 'Eravikulam National Park', 'Mattupetty Dam'],
    tags: ['nature', 'adventure'], foods: ['Puttu', 'Appam'],
  },
  {
    city: 'Rishikesh', country: 'India', region: 'Uttarakhand', query: 'Rishikesh',
    blurb: 'Riverside ashrams and Himalayan foothills on the Ganges.',
    latitude: 30.0869, longitude: 78.2676,
    photos: ['Rishikesh', 'Lakshman Jhula', 'Rajaji National Park'],
    tags: ['adventure', 'religious', 'nature'], foods: ['Thali', 'Kachori'],
  },
  {
    city: 'Kyoto', country: 'Japan', region: 'Kansai', query: 'Kyoto, Japan',
    blurb: 'Ancient temples, quiet gardens and traditional tea houses.',
    latitude: 35.0116, longitude: 135.7681,
    photos: ['Kinkaku-ji', 'Fushimi Inari-taisha', 'Kiyomizu-dera'],
    tags: ['culture', 'religious', 'history'], foods: ['Kaiseki', 'Ramen'],
  },
  {
    city: 'Bali', country: 'Indonesia', region: 'Lesser Sunda Islands', query: 'Bali, Indonesia',
    blurb: 'Volcanic landscapes, rice terraces and island temples.',
    latitude: -8.4095, longitude: 115.1889,
    photos: ['Pura Ulun Danu Bratan', 'Tanah Lot', 'Uluwatu Temple'],
    tags: ['beaches', 'nature', 'religious'], foods: ['Nasi goreng', 'Satay'],
  },
  {
    city: 'Santorini', country: 'Greece', region: 'Cyclades', query: 'Santorini, Greece',
    blurb: 'Whitewashed villages on the rim of a volcanic caldera.',
    latitude: 36.3932, longitude: 25.4615,
    photos: ['Santorini', 'Akrotiri (prehistoric city)', 'Oia, Greece'],
    tags: ['beaches', 'history'], foods: ['Moussaka', 'Greek salad'],
  },
];

export const FEATURED = ['Udaipur', 'Hampi', 'Munnar', 'Kyoto']
  .map(city => DESTINATIONS.find(d => d.city === city) as Destination);

export const COUNTRIES = [...new Set(DESTINATIONS.map(d => d.country))];

export interface Interest {
  key: string;
  label: string;
  icon: LucideIcon;
  suggestedCity: string;
  phrase: string;              // added to the preference text sent to SBERT
}

export const INTERESTS: Interest[] = [
  { key: 'nature', label: 'Nature', icon: TreePine, suggestedCity: 'Udaipur', phrase: 'nature, parks and scenic views' },
  { key: 'adventure', label: 'Adventure', icon: Mountain, suggestedCity: 'Rishikesh', phrase: 'adventure and outdoor activities' },
  { key: 'history', label: 'Historical', icon: Landmark, suggestedCity: 'Jaipur', phrase: 'historical monuments and forts' },
  { key: 'religious', label: 'Religious', icon: Sparkles, suggestedCity: 'Varanasi', phrase: 'temples and spiritual places' },
  { key: 'beaches', label: 'Beaches', icon: Waves, suggestedCity: 'Goa', phrase: 'beaches and the coast' },
  { key: 'culture', label: 'Cultural', icon: Palette, suggestedCity: 'Kolkata', phrase: 'museums, art and local culture' },
];

export const interestByKey = (key: string | null): Interest | undefined =>
  INTERESTS.find(interest => interest.key === key);

export const CATEGORY_FALLBACK_ICON = Compass;

export const BUDGET_PRESETS = [
  { label: '₹1,000', value: 1000, description: 'Backpacker' },
  { label: '₹2,000', value: 2000, description: 'Budget' },
  { label: '₹3,500', value: 3500, description: 'Comfortable' },
  { label: '₹6,000', value: 6000, description: 'Premium' },
  { label: '₹10,000', value: 10000, description: 'Luxury' },
];

// Cuisine tags from map data → a Wikipedia page for a typical dish.
const CUISINE_DISHES: [RegExp, string][] = [
  [/south indian|dosa|udupi/i, 'Masala dosa'],
  [/indian|thali|vegetarian|rajasthani|north/i, 'Thali'],
  [/chinese|asian|noodle/i, 'Chow mein'],
  [/pizza|italian/i, 'Pizza'],
  [/burger|american/i, 'Hamburger'],
  [/sandwich/i, 'Sandwich'],
  [/coffee|cafe/i, 'Coffee'],
  [/japanese|sushi/i, 'Sushi'],
  [/seafood|fish/i, 'Fish head curry'],
  [/kebab|mughlai/i, 'Kebab'],
];

/** A typical dish for a cuisine, used for an illustrative meal photo. */
export function dishForCuisine(cuisine?: string | null): string {
  const match = CUISINE_DISHES.find(([pattern]) => pattern.test(cuisine ?? ''));
  return match ? match[1] : 'Thali';
}
