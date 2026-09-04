import { Metadata } from 'next';
import Link from 'next/link';
import { LOCATIONS } from '../lib/locations';

export const metadata: Metadata = {
  title: 'About',
  description: 'What Swells is, how the AI surf reports are generated, and which spots are covered.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-12 font-mono text-gray-800 dark:text-neutral-100">
      <Link href="/" className="text-sm underline underline-offset-2 decoration-dashed hover:text-gray-600 dark:hover:text-neutral-200 transition-colors">
        ← Back to Swells
      </Link>

      <h1 className="mt-6 text-2xl font-bold">About Swells</h1>

      <p className="mt-4 leading-relaxed">
        Swells is a real-time, AI-generated surf report for a handful of surf spots across the
        US. Every few hours it pulls live wave, wind, and tide data — wave height and period,
        swell direction, wind speed and direction, tide state, and water temperature — from
        Open-Meteo&apos;s Marine and Weather APIs and NOAA&apos;s Tides &amp; Currents API, and
        hands that data to an AI model that writes a short, plain-language report in the voice
        of a local who knows the break.
      </p>

      <p className="mt-4 leading-relaxed">
        Reports are cached and refreshed automatically about four times a day, so what you see
        is close to current conditions rather than a stale forecast — but it&apos;s still an AI
        summary of sensor data, not a lifeguard or a local surfer standing on the beach. Always
        check conditions yourself before paddling out.
      </p>

      <h2 className="mt-8 text-lg font-bold">Spots covered</h2>
      <ul className="mt-3 space-y-1">
        {LOCATIONS.map(loc => (
          <li key={loc.slug}>
            <Link
              href={`/${loc.slug}`}
              className="underline underline-offset-2 decoration-dashed hover:text-gray-600 dark:hover:text-neutral-200 transition-colors"
            >
              {loc.name}
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-lg font-bold">Who built this</h2>
      <p className="mt-3 leading-relaxed">
        Swells is an independent, open-source project built by{' '}
        <a
          href="https://mattwhalley.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 decoration-dashed hover:text-gray-600 dark:hover:text-neutral-200 transition-colors"
        >
          Matt Whalley
        </a>
        . The source is on{' '}
        <a
          href="https://github.com/mttwhlly/swells"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 decoration-dashed hover:text-gray-600 dark:hover:text-neutral-200 transition-colors"
        >
          GitHub
        </a>
        . See the{' '}
        <Link href="/contact" className="underline underline-offset-2 decoration-dashed hover:text-gray-600 dark:hover:text-neutral-200 transition-colors">
          contact page
        </Link>{' '}
        to reach out, or the{' '}
        <Link href="/privacy" className="underline underline-offset-2 decoration-dashed hover:text-gray-600 dark:hover:text-neutral-200 transition-colors">
          privacy page
        </Link>{' '}
        for what data is collected.
      </p>
    </div>
  );
}
