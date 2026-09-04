'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

// Three phases, old-Twitter-splash style: hold at rest, expand the logo
// while the backdrop stays fully opaque (so nothing behind it is ever
// visible), then fade *only the logo* out against that still-solid
// backdrop before the whole overlay is removed. The app underneath is
// never crossfaded with the logo, so it can't show through mid-animation.
type Phase = 'hold' | 'expand' | 'fade';

const HOLD_MS = 200;
const EXPAND_MS = 550;
const FADE_MS = 250;

// Persists for the life of this browsing context (tab / installed-PWA
// session), so a reopen after the app was fully killed shows it again but
// resuming from background suspend or navigating client-side does not.
const SESSION_KEY = 'swells-splash-shown';

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>('hold');

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setVisible(true);

    const expandTimer = setTimeout(() => setPhase('expand'), HOLD_MS);
    const fadeTimer = setTimeout(() => setPhase('fade'), HOLD_MS + EXPAND_MS);
    // Mark as shown only once the sequence actually finishes — not up front —
    // so React Strict Mode's dev-only double-invoke (mount, cleanup, mount)
    // doesn't see the flag already set on its second pass and skip
    // rescheduling these timers, which would leave the splash stuck forever.
    const hideTimer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(SESSION_KEY, '1');
    }, HOLD_MS + EXPAND_MS + FADE_MS);

    return () => {
      clearTimeout(expandTimer);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-white dark:bg-neutral-900 pointer-events-none"
    >
      <div
        style={{
          transform: phase === 'hold' ? 'scale(1)' : 'scale(4.5)',
          opacity: phase === 'fade' ? 0 : 1,
          transition: phase === 'fade' ? `opacity ${FADE_MS}ms ease-in` : `transform ${EXPAND_MS}ms ease-in`,
        }}
      >
        <Image src="/wave-logo.svg" alt="" width={96} height={96} priority className="dark:hidden" />
        <Image src="/wave-logo-dark.svg" alt="" width={96} height={96} priority className="hidden dark:block" />
      </div>
    </div>
  );
}
