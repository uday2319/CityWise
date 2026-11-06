import { lazy, Suspense, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppShell from './components/AppShell';
import { PageSkeleton } from './components/ui';
import { ProfileProvider } from './context/ProfileContext';
import { TranslatorProvider, useTranslator } from './context/TranslatorContext';
import { TripProvider } from './context/TripContext';
import Dashboard from './pages/Dashboard';

const Discover = lazy(() => import('./pages/Discover'));
const Explore = lazy(() => import('./pages/Explore'));
const TripView = lazy(() => import('./pages/TripView'));
const Trips = lazy(() => import('./pages/Trips'));
const Favorites = lazy(() => import('./pages/Favorites'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

/** Old /translator links open the one translator panel. */
function TranslatorLink() {
  const { openTranslator } = useTranslator();
  useEffect(openTranslator, [openTranslator]);
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProfileProvider>
        <TripProvider>
          <TranslatorProvider>
          <BrowserRouter>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<Dashboard />} />
                  <Route path="discover" element={<Discover />} />
                  <Route path="explore" element={<Explore />} />
                  <Route path="planner" element={<TripView />} />
                  <Route path="trips" element={<Trips />} />
                  <Route path="trip/:id" element={<TripView />} />
                  <Route path="maps" element={<TripView />} />
                  <Route path="favorites" element={<Favorites />} />
                  <Route path="translator" element={<TranslatorLink />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
          </TranslatorProvider>
          <Toaster
            position="top-right"
            containerStyle={{ top: 72 }}
            toastOptions={{
              style: {
                background: '#FFFFFF',
                color: '#1E2925',
                border: '1px solid #E1E6E2',
                fontSize: '14px',
                fontWeight: 500,
              },
            }}
          />
        </TripProvider>
      </ProfileProvider>
    </QueryClientProvider>
  );
}
