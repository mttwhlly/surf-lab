import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'How to reach out about Swells — bugs, feature requests, or a spot to add.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-12 font-mono text-gray-800 dark:text-neutral-100">
      <Link href="/" className="text-sm underline underline-offset-2 decoration-dashed hover:text-gray-600 dark:hover:text-neutral-200 transition-colors">
        ← Back to Swells
      </Link>

      <h1 className="mt-6 text-2xl font-bold">Contact</h1>

      <p className="mt-4 leading-relaxed">
        Swells is a small, independent project — there&apos;s no support team, just the person
        who built it.
      </p>

      <h2 className="mt-8 text-lg font-bold">Want a spot added?</h2>
      <p className="mt-3 leading-relaxed">
        Use the &ldquo;Suggest a spot&rdquo; option in the location picker inside the app. It
        goes straight into the queue for new locations.
      </p>

      <h2 className="mt-8 text-lg font-bold">Found a bug, or have a feature idea?</h2>
      <p className="mt-3 leading-relaxed">
        Open an issue on{' '}
        <a
          href="https://github.com/mttwhlly/swells/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 decoration-dashed hover:text-gray-600 dark:hover:text-neutral-200 transition-colors"
        >
          GitHub
        </a>
        .
      </p>

      <h2 className="mt-8 text-lg font-bold">Anything else</h2>
      <p className="mt-3 leading-relaxed">
        Reach the builder,{' '}
        <a
          href="https://mattwhalley.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 decoration-dashed hover:text-gray-600 dark:hover:text-neutral-200 transition-colors"
        >
          Matt Whalley
        </a>
        , through the contact details on his site.
      </p>
    </div>
  );
}
