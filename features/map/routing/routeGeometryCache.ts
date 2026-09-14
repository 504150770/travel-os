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
  stats: () => RouteGeometryCacheStats;
};

export type RouteGeometryCacheStats = {
  hits: number;
  misses: number;
  writes: number;
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
  const stats = { hits: 0, misses: 0, writes: 0 };
  return {
    get: (key) => {
      const value = values.get(key);
      if (value) stats.hits += 1;
      else stats.misses += 1;
      return value;
    },
    set: (key, value) => {
      stats.writes += 1;
      values.set(key, value);
    },
    stats: () => ({ ...stats }),
  };
}

let browserEntries: Record<string, CachedRouteGeometry> | null = null;

export function createBrowserRouteGeometryCache(): RouteGeometryCache {
  const read = () => {
    if (browserEntries) return browserEntries;
    if (typeof window === 'undefined') return {} as Record<string, CachedRouteGeometry>;
    try {
      browserEntries = JSON.parse(window.localStorage.getItem(ROUTE_GEOMETRY_CACHE_KEY) ?? '{}') as Record<string, CachedRouteGeometry>;
    } catch {
      browserEntries = {};
    }
    return browserEntries;
  };
  const stats = { hits: 0, misses: 0, writes: 0 };
  return {
    get: (key) => {
      const value = read()[key];
      if (value) stats.hits += 1;
      else stats.misses += 1;
      return value;
    },
    set: (key, value) => {
      if (typeof window === 'undefined') return;
      try {
        const entries = read();
        entries[key] = value;
        stats.writes += 1;
        window.localStorage.setItem(ROUTE_GEOMETRY_CACHE_KEY, JSON.stringify(entries));
      } catch {
        // The map still has a schematic fallback when storage is unavailable.
      }
    },
    stats: () => ({ ...stats }),
  };
}
