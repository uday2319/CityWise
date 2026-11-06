import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Compass,
  Globe2,
  Heart,
  LayoutDashboard,
  Map as MapIcon,
  Menu,
  Mic,
  Route,
  Search,
  Settings,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useTranslator } from '../context/TranslatorContext';
import { PageSkeleton } from './ui';
import VoiceTranslator from './VoiceTranslator';

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/explore', label: 'Explore Destinations', icon: Globe2 },
  { to: '/planner', label: 'AI Trip Planner', icon: Route },
  { to: '/trips', label: 'My Trips', icon: Briefcase },
  { to: '/maps', label: 'Interactive Maps', icon: MapIcon },
  { to: '/favorites', label: 'Favorites', icon: Heart },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function Brand({ labelled }: { labelled: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="CityWise dashboard">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-500 text-pine">
        <Compass size={22} />
      </span>
      <span className={labelled ? 'block' : 'hidden xl:block'}>
        <span className="block text-lg font-extrabold leading-tight text-white">CityWise</span>
        <span className="block text-[11px] leading-tight text-teal-100">
          Explore Smarter. Travel Better.
        </span>
      </span>
    </Link>
  );
}

function SideNav({ labelled }: { labelled: boolean }) {
  const { openTranslator } = useTranslator();
  const textClass = labelled ? 'inline' : 'hidden xl:inline';

  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto px-3 py-4">
      <div className="mb-4 px-1">
        <Brand labelled={labelled} />
      </div>

      <nav aria-label="Main" className="space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            aria-label={label}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-forest-700 text-white'
                  : 'text-forest-100 hover:bg-forest-800 hover:text-white'
              }`
            }
          >
            <Icon size={19} className="flex-shrink-0" />
            <span className={textClass}>{label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={openTranslator}
        title="Voice Translator"
        aria-label="Open Voice Translator"
        className="mt-3 flex items-center gap-3 rounded-xl bg-teal-500 px-3 py-2.5 text-sm font-bold text-pine transition-colors hover:bg-teal-400"
      >
        <Mic size={19} className="flex-shrink-0" />
        <span className={textClass}>Voice Translator</span>
      </button>
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { openTranslator } = useTranslator();
  const [query, setQuery] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = query.trim();
    if (text) navigate(`/discover?q=${encodeURIComponent(text)}`);
  };

  const initial = profile.name.trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-[1000] flex h-16 items-center gap-3 border-b border-line bg-canvas/95 px-4 backdrop-blur sm:px-5">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        className="icon-btn text-ink hover:bg-forest-50 lg:hidden"
      >
        <Menu size={22} />
      </button>

      <form onSubmit={submit} role="search" className="relative min-w-0 max-w-xl flex-1">
        <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute" />
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search destinations"
          aria-label="Search destinations"
          className="w-full rounded-full border border-line bg-white py-2.5 pl-10 pr-4 text-sm placeholder-ink-mute focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <Link to="/favorites" aria-label="Favorites" className="icon-btn hidden text-ink hover:bg-forest-50 sm:inline-flex">
          <Heart size={20} />
        </Link>
        <button
          type="button"
          onClick={openTranslator}
          aria-label="Open Voice Translator"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-forest-800 px-3 text-sm font-semibold text-white transition-colors hover:bg-forest-700 sm:px-4"
        >
          <Mic size={17} />
          <span className="hidden sm:inline">Voice Translator</span>
        </button>
        <Link
          to="/profile"
          aria-label="Your profile"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ember-500 font-bold text-ink"
        >
          {initial || <User size={18} />}
        </Link>
      </div>
    </header>
  );
}

export default function AppShell() {
  const { pathname } = useLocation();
  const { isOpen, openTranslator } = useTranslator();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawerOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-[1100] hidden w-[76px] bg-pine lg:block xl:w-[244px]">
        <SideNav labelled={false} />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-[1300] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-pine/50"
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-pine">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              className="icon-btn absolute right-2 top-3 z-10 text-white hover:bg-forest-800"
            >
              <X size={20} />
            </button>
            <SideNav labelled />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:pl-[76px] xl:pl-[244px]">
        <TopBar onMenu={() => setDrawerOpen(true)} />

        <main className="flex-1">
          <div key={pathname} className="page-enter">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {!isOpen && (
        <button
          type="button"
          onClick={openTranslator}
          aria-label="Open Voice Translator"
          title="Voice Translator"
          className="fixed bottom-5 right-5 z-[1200] flex h-14 w-14 items-center justify-center rounded-full bg-ember-500 text-ink shadow-lift transition-transform hover:scale-105"
        >
          <Mic size={24} />
        </button>
      )}

      <VoiceTranslator />
    </div>
  );
}
