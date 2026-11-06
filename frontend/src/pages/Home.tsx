import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BrainCircuit,
  Languages,
  Route,
  Search,
  Sparkles,
  Wallet,
} from 'lucide-react';
import CityInput from '../components/CityInput';
import { PlaceImage, SaveHeart, SectionHeading, usePhoto } from '../components/ui';
import { BUDGET_PRESETS, DESTINATIONS, FEATURED, INTERESTS } from '../lib/catalog';

const WHY_CITYWISE = [
  { icon: BrainCircuit, title: 'AI recommendations', text: 'Describe a trip in your own words and semantic search finds places that match.' },
  { icon: Sparkles, title: 'Personalised itineraries', text: 'Day-by-day plans shaped around your interests, pace and trip length.' },
  { icon: Route, title: 'Route optimisation', text: 'Each day’s stops are ordered to cut the distance you travel.' },
  { icon: Wallet, title: 'Budget-aware planning', text: 'Set a daily budget and see how the plan measures up against it.' },
  { icon: Languages, title: 'Voice translation', text: 'Speak with locals across languages, with travel phrases ready to use.' },
];

function HeroSearch() {
  const navigate = useNavigate();
  const [city, setCity] = useState('');
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState(3500);
  const [travellers, setTravellers] = useState(2);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams({
      city: city.trim(),
      days: String(days),
      budget: String(budget),
      travellers: String(travellers),
    });
    navigate(`/planner?${params.toString()}`);
  };

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-2xl bg-white p-4 text-ink shadow-lift md:grid-cols-[1.6fr_0.8fr_1fr_0.8fr_auto] md:items-end"
    >
      <CityInput value={city} onChange={setCity} required />
      <div>
        <label htmlFor="hero-days" className="label">Duration</label>
        <select id="hero-days" className="input" value={days} onChange={e => setDays(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 7, 10, 14].map(n => (
            <option key={n} value={n}>{n} {n === 1 ? 'day' : 'days'}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="hero-budget" className="label">Budget per day</label>
        <select id="hero-budget" className="input" value={budget} onChange={e => setBudget(Number(e.target.value))}>
          {BUDGET_PRESETS.map(preset => (
            <option key={preset.value} value={preset.value}>
              {preset.label} {preset.description}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="hero-travellers" className="label">Travellers</label>
        <select id="hero-travellers" className="input" value={travellers} onChange={e => setTravellers(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <button type="submit" className="btn-primary h-[42px] px-6">
        <Search size={17} /> Explore
      </button>
    </form>
  );
}

export default function Home() {
  const { data: heroPhoto } = usePhoto('Lake Pichola', undefined, 1600);

  return (
    <>
      <section className="relative isolate bg-forest-900 text-white">
        {heroPhoto?.url && (
          <img
            src={heroPhoto.url}
            alt="Lake Pichola in Udaipur"
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-70"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-forest-900/90 via-forest-900/55 to-forest-900/20" />

        <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6 lg:pt-24">
          <p className="mb-3 text-sm font-semibold text-teal-200">
            CityWise · Explore Smarter. Travel Better.
          </p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.1] sm:text-6xl">
            Your Next Journey Starts Here.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/90">
            Discover destinations, explore hidden places and create intelligent
            travel itineraries with CityWise.
          </p>
          <div className="mt-10">
            <HeroSearch />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-14 sm:px-6">
        <section>
          <SectionHeading
            eyebrow="Popular destinations"
            title="Where travellers are heading"
            subtitle="Start with a place, then shape the trip around you."
            action={
              <Link to="/explore" className="btn-secondary">
                Explore all <ArrowRight size={16} />
              </Link>
            }
          />
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {DESTINATIONS.map(destination => (
              <li key={destination.city} className="relative">
                <Link
                  to={`/explore?city=${encodeURIComponent(destination.city)}`}
                  className="card group block h-full overflow-hidden transition-shadow hover:shadow-lift"
                >
                  <PlaceImage
                    query={destination.photo}
                    width={640}
                    alt={destination.photo}
                    className="h-44 w-full"
                  />
                  <div className="p-4">
                    <h3 className="font-bold group-hover:text-forest-700">{destination.city}</h3>
                    <p className="text-xs font-semibold text-forest-500">{destination.region}</p>
                    <p className="mt-1.5 text-sm text-ink-soft">{destination.blurb}</p>
                  </div>
                </Link>
                <SaveHeart city={destination.city} className="absolute right-2.5 top-2.5" />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHeading
            eyebrow="Explore by interest"
            title="Travel the way you like to"
          />
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {INTERESTS.map(({ key, label, icon: Icon, suggestedCity }) => (
              <li key={key}>
                <Link
                  to={`/explore?city=${encodeURIComponent(suggestedCity)}&interest=${key}`}
                  className="card flex h-full flex-col items-start gap-3 p-4 transition-colors hover:border-forest-200 hover:bg-forest-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-800">
                    <Icon size={20} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{label}</span>
                    <span className="block text-xs text-ink-soft">in {suggestedCity}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl bg-forest-800 p-6 text-white sm:p-10">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-teal-200">Why CityWise?</p>
          <h2 className="max-w-xl text-2xl font-extrabold sm:text-3xl">
            A travel companion that does the planning with you
          </h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {WHY_CITYWISE.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <Icon size={22} className="text-ember-500" />
                <h3 className="mt-2 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-forest-100">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHeading
            eyebrow="Travel inspiration"
            title="Featured destinations"
            subtitle="Beyond the usual route: three places worth the detour."
          />
          <ul className="grid gap-5 md:grid-cols-3">
            {FEATURED.map(destination => (
              <li key={destination.city}>
                <Link
                  to={`/planner?city=${encodeURIComponent(destination.city)}`}
                  className="group relative block h-80 overflow-hidden rounded-2xl bg-forest-100 shadow-soft"
                >
                  <PlaceImage
                    query={destination.photo}
                    width={800}
                    alt={destination.photo}
                    className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-900/95 via-forest-900/70 to-transparent p-5 pt-16 text-white">
                    <p className="text-xs font-semibold text-teal-200">{destination.region}</p>
                    <h3 className="text-xl font-extrabold">{destination.city}</h3>
                    <p className="mt-1 text-sm text-white/90">{destination.blurb}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-ember-100">
                      Plan this trip <ArrowRight size={15} />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
