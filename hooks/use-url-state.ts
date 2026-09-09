'use client';

import { useCallback, useEffect, useRef } from 'react';

export function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  return {
    view: params.get('view'),
    day: Number(params.get('day')),
    tab: params.get('tab'),
    city: params.get('city'),
  };
}

export function useUrlState(onPopState: () => void) {
  const callback = useRef(onPopState);
  callback.current = onPopState;
  useEffect(() => {
    const handler = () => callback.current();
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  return useCallback(
    (
      values: Record<string, string | number | null | undefined>,
      mode: 'push' | 'replace' = 'push',
    ) => {
      const url = new URL(window.location.href);
      Object.entries(values).forEach(([key, value]) => {
        if (value == null || value === '') url.searchParams.delete(key);
        else url.searchParams.set(key, String(value));
      });
      window.history[mode === 'push' ? 'pushState' : 'replaceState'](
        {},
        '',
        `${url.pathname}${url.search}${url.hash}`,
      );
    },
    [],
  );
}
