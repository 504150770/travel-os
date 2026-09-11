import type { RouteEndpoint, RoutingProfile } from '@/features/map/routing/routingProvider';

export const ROUTE_GEOMETRY_CACHE_KEY = 'travel.route-geometry.v1';

export type CachedRouteGeometry = {
  coordinates: [number, number][];
  provider: string;
  cachedAt: string;
};

export type RouteGeometryCache = {
  get: (key: string) => CachedRouteGeometry | undefined;
  set: (key: string, value: CachedRouteGeometry) => void;
};

const coordinateKey = (point: RouteEndpoint) =>
  `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;

export function geometryCacheKey(
  origin: RouteEndpoint,
  destination: RouteEndpoint,
  profile: RoutingProfile,
) {
  return `${profile}:${coordinateKey(origin)}>${coordinateKey(destination)}`;
}

export function createMemoryRouteGeometryCache(
  initial: Record<string, CachedRouteGeometry> = {},
): RouteGeometryCache {
  const values = new Map(Object.entries(initial));
  return {
    get: (key) => values.get(key),
    set: (key, value) => values.set(key, value),
  };
}

export function createBrowserRouteGeometryCache(): RouteGeometryCache {
  const read = () => {
    if (typeof window === 'undefined') return {} as Record<string, CachedRouteGeometry>;
    try {
      return JSON.parse(window.localStorage.getItem(ROUTE_GEOMETRY_CACHE_KEY) ?? '{}') as Record<string, CachedRouteGeometry>;
    } catch {
      return {} as Record<string, CachedRouteGeometry>;
    }
  };
  return {
    get: (key) => read()[key],
    set: (key, value) => {
      if (typeof window === 'undefined') return;
      try {
        const entries = read();
        entries[key] = value;
        window.localStorage.setItem(ROUTE_GEOMETRY_CACHE_KEY, JSON.stringify(entries));
      } catch {
        // The map still has a schematic fallback when storage is unavailable.
      }
    },
  };
}

