import Link from 'next/link';
import { LOCATIONS } from './lib/locations';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-12 font-mono text-gray-800 dark:text-neutral-100">
      <h1 className="text-2xl font-bold">404 — Page not found</h1>
      <p className="mt-4 leading-relaxed">
        There&apos;s nothing at this address. Here&apos;s where to go instead:
      </p>

      <ul className="mt-6 space-y-1">
        <li>
          <Link href="/" className="underline underline-offset-2 decoration-dashed hover:text-gray-600 dark:hover:text-neutral-200 transition-colors">
            Home
          </Link>
        </li>
        {LOCATIONS.map(loc => (
          <li key={loc.slug}>
            <Link
              href={`/${loc.slug}`}
              className="underline underline-offset-2 decoration-dashed hover:text-gray-600 dark:hover:text-neutral-200 transition-colors"
            >
              {loc.name} surf report
            </Link>
          </li>
        ))}
        <li>
          <a href="/sitemap.xml" className="underline underline-offset-2 decoration-dashed hover:text-gray-600 dark:hover:text-neutral-200 transition-colors">
            Sitemap
          </a>
        </li>
      </ul>
    </div>
  );
}
