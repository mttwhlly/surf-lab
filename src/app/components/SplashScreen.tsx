'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

// Old-Twitter-splash style: hold at rest, then one continuous motion where
// the logo scales up and fades to nothing at the same time, while the
// backdrop fades away underneath it at the same rate — so the whole thing
// dissolves into the app in one smooth beat instead of a hard cut at the end.
type Phase = 'hold' | 'leaving';

const HOLD_MS = 250;
const LEAVE_MS = 700;

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

    const leaveTimer = setTimeout(() => setPhase('leaving'), HOLD_MS);
    // Mark as shown only once the sequence actually finishes — not up front —
    // so React Strict Mode's dev-only double-invoke (mount, cleanup, mount)
    // doesn't see the flag already set on its second pass and skip
    // rescheduling this timer, which would leave the splash stuck forever.
    const hideTimer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(SESSION_KEY, '1');
    }, HOLD_MS + LEAVE_MS);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  const leaving = phase === 'leaving';

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-white dark:bg-neutral-900 pointer-events-none"
      style={{
        opacity: leaving ? 0 : 1,
        transition: `opacity ${LEAVE_MS}ms ease-out`,
      }}
    >
      <div
        style={{
          transform: leaving ? 'scale(4.5)' : 'scale(1)',
          opacity: leaving ? 0 : 1,
          transition: `transform ${LEAVE_MS}ms ease-out, opacity ${LEAVE_MS}ms ease-out`,
        }}
      >
        <Image src="/wave-logo.svg" alt="" width={96} height={96} priority className="dark:hidden" />
        <Image src="/wave-logo-dark.svg" alt="" width={96} height={96} priority className="hidden dark:block" />
      </div>
    </div>
  );
}
