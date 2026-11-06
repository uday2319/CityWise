/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Heart, X, type LucideIcon } from 'lucide-react';
import { itineraApi } from '../api/itineraApi';
import { CATEGORY_FALLBACK_ICON } from '../lib/catalog';
import { useProfile } from '../context/ProfileContext';
import type { ExplorePlace } from '../types';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <div
      className="mx-auto max-w-6xl space-y-5 px-4 py-10 sm:px-6"
      role="status"
      aria-label="Loading page"
    >
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-56" />)}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="card mx-auto flex max-w-lg flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-800">
        <Icon size={26} />
      </span>
      <h2 className="text-lg font-bold">{title}</h2>
      {children && <p className="mt-1.5 text-sm text-ink-soft">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorNotice({
  children,
  onRetry,
}: {
  children: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-900"
    >
      <AlertTriangle size={17} className="mt-0.5 flex-shrink-0" />
      <div className="flex-1">{children}</div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function usePhoto(query: string, context?: string, width = 800, enabled = true) {
  return useQuery({
    queryKey: ['photo', query, context, width],
    queryFn: () => itineraApi.getPhoto(query, context, width),
    staleTime: Infinity,
    enabled: enabled && query.length >= 2,
  });
}

/** A real photo of the place, or a neutral tile when none could be matched. */
export function PlaceImage({
  query,
  context,
  width = 800,
  alt,
  className = '',
  icon: Icon = CATEGORY_FALLBACK_ICON,
}: {
  query: string;
  context?: string;
  width?: number;
  alt: string;
  className?: string;
  icon?: LucideIcon;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [failed, setFailed] = useState(false);

  // Long lists hold many images; only look up the ones close to the screen.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { data, isSuccess, isError } = usePhoto(query, context, width, inView);
  const settled = isSuccess || isError;

  return (
    <div ref={box} className={`overflow-hidden bg-forest-100 ${className}`}>
      {!settled && <Skeleton className="h-full w-full rounded-none" />}
      {settled && (!data?.url || failed) && (
        <div className="flex h-full w-full items-center justify-center bg-forest-100 text-forest-500">
          <Icon size={24} aria-hidden="true" />
        </div>
      )}
      {settled && data?.url && !failed && (
        <img
          src={data.url}
          alt={alt}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}

export function SaveHeart({ city, className = '' }: { city: string; className?: string }) {
  const { profile, toggleDestination } = useProfile();
  const saved = profile.savedDestinations.includes(city);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${city} from saved destinations` : `Save ${city}`}
      onClick={event => {
        event.preventDefault();
        event.stopPropagation();
        toggleDestination(city);
      }}
      className={`icon-btn bg-white/95 text-ink shadow-soft hover:bg-white ${className}`}
    >
      <Heart
        size={17}
        className={saved ? 'fill-ember-500 text-ember-500' : ''}
      />
    </button>
  );
}

export function SavePlaceHeart({ place, className = '' }: { place: ExplorePlace; className?: string }) {
  const { profile, togglePlace } = useProfile();
  const saved = profile.savedPlaces.some(item => item.id === place.id);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${place.name} from favorites` : `Save ${place.name} to favorites`}
      onClick={() => togglePlace(place)}
      className={`icon-btn bg-white/95 text-ink shadow-soft hover:bg-white ${className}`}
    >
      <Heart size={17} className={saved ? 'fill-ember-500 text-ember-500' : ''} />
    </button>
  );
}

export function Dialog({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className={`m-auto w-[calc(100%-2rem)] rounded-2xl p-0 shadow-lift ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="font-bold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="icon-btn text-ink-soft hover:bg-forest-50"
        >
          <X size={18} />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
    </dialog>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
