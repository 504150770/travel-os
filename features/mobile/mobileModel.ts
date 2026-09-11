import type { MapPoint } from '@/features/map/mapModel';

export type MobileView = 'today' | 'map' | 'explore' | 'plan' | 'more';

export const MOBILE_VIEWS: MobileView[] = ['today', 'map', 'explore', 'plan', 'more'];

export function mobileViewFromUrl(value: string | null | undefined): MobileView {
  if (value === 'map') return 'map';
  if (value === 'discover' || value === 'explore') return 'explore';
  if (value === 'plan') return 'plan';
  if (value === 'more') return 'more';
  return 'today';
}

export function desktopViewFromUrl(
  value: string | null | undefined,
): 'home' | 'trip' | 'discover' | 'plan' | 'more' {
  if (value === 'today' || value === 'map') return 'trip';
  if (value === 'explore') return 'discover';
  if (['home', 'trip', 'discover', 'plan', 'more'].includes(value ?? '')) {
    return value as 'home' | 'trip' | 'discover' | 'plan' | 'more';
  }
  return 'home';
}

export function desktopViewForMobile(view: MobileView) {
  if (view === 'today' || view === 'map') return 'trip' as const;
  if (view === 'explore') return 'discover' as const;
  return view;
}

export type MobileMapPoint = MapPoint;

export function compactModeLabel(mode: 'Walk' | 'Transit' | 'Taxi') {
  if (mode === 'Walk') return 'Walk';
  if (mode === 'Taxi') return 'Taxi';
  return 'Transit';
}
