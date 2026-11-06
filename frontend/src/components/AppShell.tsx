import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Compass, Menu, X } from 'lucide-react';
import { PageSkeleton } from './ui';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/explore', label: 'Explore' },
  { to: '/planner', label: 'AI Trip Planner' },
  { to: '/trips', label: 'My Trips' },
  { to: '/maps', label: 'Maps' },
  { to: '/translator', label: 'Voice Translator' },
  { to: '/profile', label: 'Profile' },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="CityWise home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-800 text-white">
        <Compass size={20} />
      </span>
      <span className="text-lg font-extrabold tracking-tight text-forest-800">
        City<span className="text-teal-600">Wise</span>
      </span>
    </Link>
  );
}

export default function AppShell() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-forest-50 text-forest-800'
        : 'text-ink-soft hover:bg-forest-50 hover:text-forest-800'
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-[1100] border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />

          <nav aria-label="Main" className="hidden items-center gap-0.5 xl:flex">
            {NAV_ITEMS.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            className="icon-btn text-ink hover:bg-forest-50 xl:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(open => !open)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <nav aria-label="Mobile" className="grid gap-1 border-t border-line px-4 py-3 xl:hidden">
            {NAV_ITEMS.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">
        <div key={pathname} className="page-enter">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-1 px-4 py-5 text-xs text-ink-mute sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            <span className="font-semibold text-forest-800">CityWise</span>
            {' · '}Explore Smarter. Travel Better.
          </p>
          <p>
            Places by Geoapify and OpenStreetMap. Photos from Wikipedia. Weather by Open-Meteo.
          </p>
        </div>
      </footer>
    </div>
  );
}
