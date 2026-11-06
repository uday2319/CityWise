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
  region: string;
  blurb: string;
  photo: string;               // Wikipedia page used for the image
}

export const DESTINATIONS: Destination[] = [
  { city: 'Jaipur', region: 'Rajasthan', photo: 'Hawa Mahal', blurb: 'Pink sandstone palaces, hilltop forts and lively bazaars.' },
  { city: 'Udaipur', region: 'Rajasthan', photo: 'Lake Pichola', blurb: 'Lakeside palaces framed by the Aravalli hills.' },
  { city: 'Agra', region: 'Uttar Pradesh', photo: 'Taj Mahal', blurb: 'Home of the Taj Mahal and Mughal-era monuments.' },
  { city: 'Goa', region: 'Goa', photo: 'Palolem', blurb: 'Long beaches, Portuguese churches and coastal food.' },
  { city: 'Varanasi', region: 'Uttar Pradesh', photo: 'Dashashwamedh Ghat', blurb: 'Ancient ghats and evening rituals on the Ganges.' },
  { city: 'Delhi', region: 'Delhi', photo: 'India Gate', blurb: 'Centuries of history alongside a modern capital.' },
  { city: 'Mumbai', region: 'Maharashtra', photo: 'Gateway of India', blurb: 'Colonial landmarks, sea views and street food.' },
  { city: 'Mysore', region: 'Karnataka', photo: 'Mysore Palace', blurb: 'A royal city of palaces, silk and sandalwood.' },
];

export const FEATURED: Destination[] = [
  { city: 'Hampi', region: 'Karnataka', photo: 'Hampi', blurb: 'Temple ruins of the Vijayanagara capital, set among giant boulders.' },
  { city: 'Munnar', region: 'Kerala', photo: 'Munnar', blurb: 'Rolling tea estates and cool air high in the Western Ghats.' },
  { city: 'Rishikesh', region: 'Uttarakhand', photo: 'Rishikesh', blurb: 'Riverside ashrams and Himalayan foothills on the Ganges.' },
];

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
  { key: 'history', label: 'Historical places', icon: Landmark, suggestedCity: 'Jaipur', phrase: 'historical monuments and forts' },
  { key: 'religious', label: 'Religious places', icon: Sparkles, suggestedCity: 'Varanasi', phrase: 'temples and spiritual places' },
  { key: 'beaches', label: 'Beaches', icon: Waves, suggestedCity: 'Goa', phrase: 'beaches and the coast' },
  { key: 'culture', label: 'Cultural experiences', icon: Palette, suggestedCity: 'Kolkata', phrase: 'museums, art and local culture' },
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
