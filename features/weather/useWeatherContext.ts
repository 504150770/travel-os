'use client';

import { useEffect, useMemo, useState } from 'react';
import { openMeteoProvider } from '@/features/weather/openMeteoProvider';
import type { ForecastWeather, WeatherRequest } from '@/features/weather/weatherProvider';
import {
  DECEMBER_SEASONAL_REFERENCE,
  WEATHER_CACHE_KEY,
  isFreshWeather,
  isWithinForecastHorizon,
  weatherCacheKey,
  type SeasonalReference,
} from '@/features/weather/weatherModel';

export type WeatherContextState =
  | { kind: 'seasonal'; reference: SeasonalReference }
  | { kind: 'forecast'; weather: ForecastWeather; cached: boolean }
  | { kind: 'loading' }
  | { kind: 'unavailable' };

const readCache = () => {
  if (typeof window === 'undefined') return {} as Record<string, ForecastWeather>;
  try { return JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) ?? '{}') as Record<string, ForecastWeather>; }
  catch { return {} as Record<string, ForecastWeather>; }
};

export function useWeatherContext({
  city,
  date,
  coordinates,
}: {
  city: string;
  date: string;
  coordinates?: { lat: number; lng: number };
}): WeatherContextState {
  const request = useMemo<WeatherRequest | null>(() => coordinates ? {
    lat: coordinates.lat, lng: coordinates.lng, date,
  } : null, [coordinates, date]);
  const seasonal = DECEMBER_SEASONAL_REFERENCE[city];
  const [state, setState] = useState<WeatherContextState>(() => seasonal
    ? { kind: 'seasonal', reference: seasonal }
    : { kind: 'unavailable' });

  useEffect(() => {
    if (!request || !isWithinForecastHorizon(date)) return;
    const key = weatherCacheKey(request);
    const existing = readCache()[key];
    const initialTimer = window.setTimeout(() => setState(existing ? { kind: 'forecast', weather: existing, cached: !isFreshWeather(existing) } : { kind: 'loading' }), 0);
    if (existing && isFreshWeather(existing)) return () => window.clearTimeout(initialTimer);
    const controller = new AbortController();
    openMeteoProvider.forecast(request, controller.signal).then((weather) => {
      const cache = readCache();
      cache[key] = weather;
      try { localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache)); } catch { /* forecast still displays */ }
      setState({ kind: 'forecast', weather, cached: false });
    }).catch(() => {
      if (!controller.signal.aborted) {
        setState(existing ? { kind: 'forecast', weather: existing, cached: true } : { kind: 'unavailable' });
      }
    });
    return () => { window.clearTimeout(initialTimer); controller.abort(); };
  }, [city, date, request, seasonal]);
  if (!request || !isWithinForecastHorizon(date)) {
    return seasonal ? { kind: 'seasonal', reference: seasonal } : { kind: 'unavailable' };
  }
  return state;
}
