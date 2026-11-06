import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppShell from './components/AppShell';
import { PageSkeleton } from './components/ui';
import { ProfileProvider } from './context/ProfileContext';
import { TripProvider } from './context/TripContext';
import Home from './pages/Home';

const Explore = lazy(() => import('./pages/Explore'));
const Planner = lazy(() => import('./pages/Planner'));
const TripView = lazy(() => import('./pages/TripView'));
const Trips = lazy(() => import('./pages/Trips'));
const Translator = lazy(() => import('./pages/Translator'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProfileProvider>
        <TripProvider>
          <BrowserRouter>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<Home />} />
                  <Route path="explore" element={<Explore />} />
                  <Route path="planner" element={<Planner />} />
                  <Route path="trips" element={<Trips />} />
                  <Route path="trip/:id" element={<TripView />} />
                  <Route path="maps" element={<TripView />} />
                  <Route path="translator" element={<Translator />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster
            position="top-right"
            containerStyle={{ top: 76 }}
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
