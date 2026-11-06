import { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { itineraApi } from '../api/itineraApi';

/** Free-text city field with suggestions from /cities/search. */
export default function CityInput({
  value,
  onChange,
  placeholder = 'Where to? Try Jaipur, Goa, Mysore',
  label = 'Destination',
  hideLabel = false,
  required = false,
}: {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  label?: string;
  hideLabel?: boolean;
  required?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), 200);
    return () => clearTimeout(timer);
  }, [value]);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['city-search', debounced.toLowerCase()],
    queryFn: () => itineraApi.searchCities(debounced),
    enabled: debounced.trim().length >= 1,
    staleTime: 5 * 60 * 1000,
  });

  const matches = suggestions.filter(
    city => city.toLowerCase() !== value.trim().toLowerCase()
  );
  const showList = open && matches.length > 0;

  return (
    <div className="relative">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'label'}>
        {label}
      </label>
      <div className="relative">
        <MapPin
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-forest-500"
        />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          required={required}
          value={value}
          placeholder={placeholder}
          onChange={event => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={event => event.key === 'Escape' && setOpen(false)}
          className="input pl-9"
        />
      </div>
      {showList && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute z-[1200] mt-1 w-full overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lift"
        >
          {matches.map(city => (
            <li key={city} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={() => {
                  onChange(city);
                  setOpen(false);
                }}
                className="w-full px-3.5 py-2 text-left text-sm text-ink hover:bg-forest-50"
              >
                {city}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
