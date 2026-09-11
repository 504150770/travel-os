'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 767px)';

function subscribe(callback: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

function snapshot() {
  return window.matchMedia(QUERY).matches;
}

export function useMobileViewport() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
