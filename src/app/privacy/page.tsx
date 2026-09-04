import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What data Swells collects, why, and how to have it removed.',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-12 font-mono text-gray-800 dark:text-neutral-100">
      <Link href="/" className="text-sm underline underline-offset-2 decoration-dashed hover:text-gray-600 dark:hover:text-neutral-200 transition-colors">
        ← Back to Swells
      </Link>

      <h1 className="mt-6 text-2xl font-bold">Privacy</h1>

      <p className="mt-4 leading-relaxed">
        Swells doesn&apos;t have user accounts, doesn&apos;t sell data, and doesn&apos;t run
        advertising or cross-site tracking. Here&apos;s the complete list of what it does store.
      </p>

      <h2 className="mt-8 text-lg font-bold">Push notifications</h2>
      <p className="mt-3 leading-relaxed">
        If you opt in to notifications, your browser&apos;s push subscription (an endpoint URL
        and encryption keys assigned by your browser, not by us), your chosen surf location, and
        the condition thresholds you set are stored so a matching report can trigger a
        notification. Turning notifications off, or unsubscribing, deletes that row. No account
        or personal identity is attached to it.
      </p>

      <h2 className="mt-8 text-lg font-bold">Spot suggestions</h2>
      <p className="mt-3 leading-relaxed">
        If you use &ldquo;Suggest a spot&rdquo;, the spot name, city/state, and an email address
        if you choose to provide one are stored so the suggestion can be followed up on.
      </p>

      <h2 className="mt-8 text-lg font-bold">Analytics</h2>
      <p className="mt-3 leading-relaxed">
        Swells uses Vercel Analytics and Speed Insights for aggregate page-view and performance
        metrics. These don&apos;t use cookies for cross-site tracking and aren&apos;t tied to
        your identity.
      </p>

      <h2 className="mt-8 text-lg font-bold">Removing your data</h2>
      <p className="mt-3 leading-relaxed">
        To have a push subscription or spot suggestion removed, reach out via the{' '}
        <Link href="/contact" className="underline underline-offset-2 decoration-dashed hover:text-gray-600 dark:hover:text-neutral-200 transition-colors">
          contact page
        </Link>
        .
      </p>
    </div>
  );
}
