'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'motion/react';
import { LOCATIONS } from '../lib/locations';

const STORAGE_KEY = 'surf_location';

function subscribeToSavedLocation() {
  return () => {};
}

function getSavedLocationSnapshot(): string | null {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved && LOCATIONS.some(l => l.slug === saved) ? saved : null;
}

function getSavedLocationServerSnapshot(): string | null | undefined {
  return undefined;
}

export function LocationGate() {
  const router = useRouter();
  const savedSlug = useSyncExternalStore(
    subscribeToSavedLocation,
    getSavedLocationSnapshot,
    getSavedLocationServerSnapshot
  );
  const status: 'checking' | 'redirecting' | 'pick' =
    savedSlug === undefined ? 'checking' : savedSlug ? 'redirecting' : 'pick';
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  useEffect(() => {
    if (savedSlug) {
      router.replace(`/${savedSlug}`);
    }
  }, [savedSlug, router]);

  useEffect(() => {
    if (!pendingSlug) return;
    const timer = setTimeout(() => router.push(`/${pendingSlug}`), 240);
    return () => clearTimeout(timer);
  }, [pendingSlug, router]);

  function handleSelect(slug: string) {
    if (!slug) return;
    localStorage.setItem(STORAGE_KEY, slug);
    setPendingSlug(slug);
  }

  if (status === 'checking' || status === 'redirecting') {
    return <div className="min-h-screen" />;
  }

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-4"
      initial={{ opacity: 0, y: 10 }}
      animate={pendingSlug ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
    >
      <Image
        src="/wave-logo.svg"
        alt="Swells Logo"
        width={96}
        height={96}
        priority
        className="dark:hidden"
      />
      <Image
        src="/wave-logo-dark.svg"
        alt="Swells Logo"
        width={96}
        height={96}
        priority
        className="hidden dark:block"
      />

      <div className="mt-10 w-full max-w-xs relative">
        <select
          defaultValue=""
          onChange={e => handleSelect(e.target.value)}
          className="w-full py-3 pl-4 pr-10 border border-gray-200 dark:border-neutral-600 rounded-xl text-base font-mono text-gray-700 dark:text-neutral-100 bg-white dark:bg-neutral-800 appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-gray-100 dark:focus:ring-neutral-700 transition-colors"
        >
          <option value="" disabled>Where are you surfing?</option>
          {LOCATIONS.map(loc => (
            <option key={loc.slug} value={loc.slug}>{loc.name}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>
    </motion.div>
  );
}
