'use client';

import { useSyncExternalStore } from 'react';

// Fires once after mount so the first client render matches the server
// snapshot (avoiding a hydration mismatch), then flips to the real clock
// value on the next render. Never fires again after that.
function subscribeOnce(callback: () => void) {
  const id = setTimeout(callback, 0);
  return () => clearTimeout(id);
}

function getNowSnapshot() {
  return Date.now();
}

function getServerSnapshot() {
  return 0;
}

export function useNow(): number {
  return useSyncExternalStore(subscribeOnce, getNowSnapshot, getServerSnapshot);
}
