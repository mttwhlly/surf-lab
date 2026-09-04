import { Metadata } from 'next';
import { LocationGate } from './components/LocationGate';
import { LOCATIONS } from './lib/locations';

export const metadata: Metadata = {
  title: 'Swells',
  description: 'Real-time AI-powered surf reports for US surf spots. St. Augustine, Rockaway Beach, Huntington Beach, and more — updated 4 times daily.',
};

// LocationGate is a client component that renders an empty shell on the
// server (it decides what to show from localStorage after hydrating), so
// without this the server-rendered HTML here has almost no text content —
// invisible to crawlers and AI agents that don't execute JS. This block is
// real content for them; sighted JS users just see LocationGate on top of it.
export default function RootPage() {
  return (
    <>
      <div className="sr-only">
        <h1>Swells — Real-Time AI Surf Reports</h1>
        <p>
          Swells delivers real-time, AI-generated surf reports for surf spots across the United
          States. Each report is built from live wave, wind, and tide data — wave height and
          period, swell direction, wind speed and direction, tide state, and water
          temperature — refreshed roughly every 4 hours and written in plain language by an AI
          that knows the break.
        </p>
        <nav aria-label="Surf report locations">
          <ul>
            {LOCATIONS.map(loc => (
              <li key={loc.slug}>
                <a href={`/${loc.slug}`}>{loc.name} surf report</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <LocationGate />
    </>
  );
}
