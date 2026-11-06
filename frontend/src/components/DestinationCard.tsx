import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { Destination } from '../lib/catalog';
import { PlaceImage, SaveHeart } from './ui';

/** A photo card that opens the destination's details on Discover. */
export default function DestinationCard({
  destination,
  tall = false,
}: {
  destination: Destination;
  tall?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => navigate(`/discover?view=${encodeURIComponent(destination.city)}`)}
        aria-label={`View ${destination.city}, ${destination.country}`}
        className={`relative block w-full overflow-hidden rounded-2xl bg-forest-800 text-left shadow-soft transition-shadow hover:shadow-lift ${
          tall ? 'h-64' : 'h-52'
        }`}
      >
        <PlaceImage
          query={destination.photos[0]}
          width={640}
          alt=""
          className="h-full w-full transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-pine/95 via-pine/70 to-transparent p-3.5 pt-12 text-white">
          <span className="block text-lg font-extrabold leading-tight">{destination.city}</span>
          <span className="flex items-center gap-1 text-xs font-medium text-white/90">
            <MapPin size={12} /> {destination.region}, {destination.country}
          </span>
          <span className="mt-1 line-clamp-2 block text-xs text-white/90">{destination.blurb}</span>
        </span>
      </button>
      <SaveHeart city={destination.city} className="absolute right-2.5 top-2.5" />
    </div>
  );
}
