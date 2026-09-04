'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

// How long the logo holds at rest before it starts animating out.
const HOLD_MS = 250;
// Scale/opacity transition duration — kept in sync with the Tailwind
// duration-[650ms] classes below.
const TRANSITION_MS = 650;

// Persists for the life of this browsing context (tab / installed-PWA
// session), so a reopen after the app was fully killed shows it again but
// resuming from background suspend or navigating client-side does not.
const SESSION_KEY = 'swells-splash-shown';

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setVisible(true);

    const leaveTimer = setTimeout(() => setLeaving(true), HOLD_MS);
    // Mark as shown only once the sequence actually finishes — not up front —
    // so React Strict Mode's dev-only double-invoke (mount, cleanup, mount)
    // doesn't see the flag already set on its second pass and skip
    // rescheduling these timers, which would leave the splash stuck forever.
    const hideTimer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(SESSION_KEY, '1');
    }, HOLD_MS + TRANSITION_MS);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-white dark:bg-neutral-900 pointer-events-none transition-opacity duration-[650ms] ease-out ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div
        className={`transition-transform duration-[650ms] ease-out ${
          leaving ? 'scale-150' : 'scale-100'
        }`}
      >
        <Image src="/wave-logo.svg" alt="" width={96} height={96} priority className="dark:hidden" />
        <Image src="/wave-logo-dark.svg" alt="" width={96} height={96} priority className="hidden dark:block" />
      </div>
    </div>
  );
}
