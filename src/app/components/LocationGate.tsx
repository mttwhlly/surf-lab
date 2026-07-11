'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LOCATIONS } from '../lib/locations';

const STORAGE_KEY = 'surf_location';

export function LocationGate() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'redirecting' | 'pick'>('checking');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LOCATIONS.find(l => l.slug === saved)) {
      setStatus('redirecting');
      router.replace(`/${saved}`);
    } else {
      setStatus('pick');
    }
  }, [router]);

  function handleSelect(slug: string) {
    localStorage.setItem(STORAGE_KEY, slug);
    router.push(`/${slug}`);
  }

  if (status === 'checking' || status === 'redirecting') {
    return <div className="min-h-screen" />;
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen px-4 mb-12">
      <div className="mt-8">
        <Image
          src="/wave-logo.svg"
          alt="Can I Surf Today? Logo"
          width={64}
          height={64}
          priority
        />
      </div>

      <div className="mt-10 max-w-sm w-full">
        <h1 className="text-center text-2xl font-bold mb-2 tracking-tight">Where are you surfing?</h1>
        <p className="text-center text-gray-500 text-sm mb-8">Pick a spot to get your AI surf report.</p>

        <div className="flex flex-col gap-3">
          {LOCATIONS.map(loc => (
            <button
              key={loc.slug}
              onClick={() => handleSelect(loc.slug)}
              className="w-full py-3 px-5 text-left border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors text-base font-medium"
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
