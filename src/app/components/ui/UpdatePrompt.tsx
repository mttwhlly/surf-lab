'use client';

import { useServiceWorker } from '@/hooks/useServiceWorker';

export function UpdatePrompt() {
  const { updateAvailable, updateApp } = useServiceWorker();

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-black text-white p-4 text-center z-[1000] glass-effect">
      New version available!
      <button 
        onClick={updateApp}
        className="ml-3 bg-white text-black border-none px-4 py-2 rounded cursor-pointer font-semibold uppercase tracking-wider"
      >
        Update
      </button>
    </div>
  );
}