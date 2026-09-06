'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const fallback = useMemo(() => JSON.stringify(initialValue), [initialValue]);
  const subscribe = useCallback((listener: () => void) => {
    const onStorage = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== key) return;
      listener();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(`travel-local:${key}`, onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(`travel-local:${key}`, onStorage);
    };
  }, [key]);
  const getSnapshot = useCallback(() => {
    try { return window.localStorage.getItem(key) ?? fallback; }
    catch { return fallback; }
  }, [fallback, key]);
  const serialized = useSyncExternalStore(subscribe, getSnapshot, () => fallback);
  const value = useMemo(() => {
    try { return JSON.parse(serialized) as T; }
    catch { return initialValue; }
  }, [initialValue, serialized]);
  const setValue = useCallback((next: T) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event(`travel-local:${key}`));
    } catch {
      // A private browser may block persistence; the guide remains readable.
    }
  }, [key]);
  return [value, setValue, true] as const;
}
