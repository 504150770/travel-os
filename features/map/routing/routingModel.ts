import type { MapPoint } from '@/features/map/mapModel';
import type { RouteEndpoint, RoutingProfile, RoutingProvider } from '@/features/map/routing/routingProvider';
import type { RouteGeometryCache } from '@/features/map/routing/routeGeometryCache';
import type { DayRoute, DayRouteLeg } from '@/lib/types';

export type RoutableLeg = {
  leg: DayRouteLeg;
  origin: RouteEndpoint;
  destination: RouteEndpoint;
  profile: RoutingProfile;
};

export type DisplayRouteGeometry = {
  legId: string;
  coordinates: [number, number][];
  source: 'routed' | 'schematic';
  cached: boolean;
  provider?: string;
};

const inFlightRoutes = new Map<string, Promise<{ coordinates: [number, number][]; provider: string }>>();

export function straightLineKm(origin: RouteEndpoint, destination: RouteEndpoint) {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(destination.lat - origin.lat);
  const dLng = radians(destination.lng - origin.lng);
  const lat1 = radians(origin.lat);
  const lat2 = radians(destination.lat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function routableLegs(route: DayRoute, points: MapPoint[]): RoutableLeg[] {
  const byId = new Map(points.map((point) => [point.id, point]));
  return route.legs.flatMap((leg) => {
    const from = byId.get(leg.fromId);
    const to = byId.get(leg.toId);
    if (!from || !to || leg.recommendedMode === 'Transit') return [];
    const origin = { lat: from.lat, lng: from.lng };
    const destination = { lat: to.lat, lng: to.lng };
    // Prevent an accidental inter-city road request on transfer days.
    if (straightLineKm(origin, destination) > 80) return [];
    return [{
      leg,
      origin,
      destination,
      profile: leg.recommendedMode === 'Walk' ? 'foot' as const : 'car' as const,
    }];
  });
}

export function schematicGeometries(route: DayRoute, points: MapPoint[]): DisplayRouteGeometry[] {
  const byId = new Map(points.map((point) => [point.id, point]));
  return route.legs.flatMap((leg) => {
    const from = byId.get(leg.fromId);
    const to = byId.get(leg.toId);
    return from && to ? [{
      legId: leg.id,
      coordinates: [[from.lat, from.lng], [to.lat, to.lng]] as [number, number][],
      source: 'schematic' as const,
      cached: false,
    }] : [];
  });
}

export function routeGeometryRequestKey(route: DayRoute, points: MapPoint[]) {
  const byId = new Map(points
    .filter((point) => point.kind === 'hotel' || point.kind === 'stop')
    .map((point) => [point.id, point]));
  return JSON.stringify(route.legs.map(({ id, fromId, toId, recommendedMode }) => {
    const from = byId.get(fromId);
    const to = byId.get(toId);
    return {
      id,
      fromId,
      toId,
      recommendedMode,
      from: from ? [from.lat, from.lng] : null,
      to: to ? [to.lat, to.lng] : null,
    };
  }));
}

export async function resolveRouteGeometry({
  item,
  key,
  provider,
  cache,
  signal,
}: {
  item: RoutableLeg;
  key: string;
  provider: RoutingProvider;
  cache: RouteGeometryCache;
  signal?: AbortSignal;
}): Promise<DisplayRouteGeometry> {
  const hit = cache.get(key);
  if (hit) return {
    legId: item.leg.id,
    coordinates: hit.coordinates,
    source: 'routed',
    cached: true,
    provider: hit.provider,
  };
  try {
    const inFlightKey = `${provider.id}:${key}`;
    let pending = inFlightRoutes.get(inFlightKey);
    if (!pending) {
      pending = provider.route(item.origin, item.destination, item.profile, signal);
      inFlightRoutes.set(inFlightKey, pending);
      void pending.finally(() => inFlightRoutes.delete(inFlightKey)).catch(() => undefined);
    }
    const result = await pending;
    cache.set(key, { ...result, cachedAt: new Date().toISOString() });
    return {
      legId: item.leg.id,
      coordinates: result.coordinates,
      source: 'routed',
      cached: false,
      provider: result.provider,
    };
  } catch {
    return {
      legId: item.leg.id,
      coordinates: [[item.origin.lat, item.origin.lng], [item.destination.lat, item.destination.lng]],
      source: 'schematic',
      cached: false,
    };
  }
}
