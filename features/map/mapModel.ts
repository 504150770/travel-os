import type { DayRoute } from '@/lib/types';

export type MapRenderStage = 'initialized' | 'markers' | 'tiles' | 'route';

// Web-Mercator projected distances double with each zoom step. Keep the
// existing marker hit areas and never zoom beyond the tile provider limit.
export function markerSeparationZoom(current: number, maximum: number, nearestPixels: number) {
  if (current >= maximum || nearestPixels >= 56 || !Number.isFinite(nearestPixels)) return current;
  return Math.min(maximum, current + Math.ceil(Math.log2(56 / Math.max(nearestPixels, 0.001))));
}

// Route/marker updates must not make an already usable tile layer look loading.
// A newly initialized instance (including Retry) starts its own readiness cycle.
export function advanceMapStage(current: MapRenderStage | 'shell', next: MapRenderStage): MapRenderStage {
  if (next === 'initialized') return next;
  const rank = { shell: 0, initialized: 1, markers: 2, route: 3, tiles: 4 };
  return rank[current] > rank[next] ? current as MapRenderStage : next;
}

export type MapPointKind = 'hotel' | 'stop' | 'food' | 'gym' | 'candidate';

export type MapPoint = {
  id: string;
  entityId?: string;
  name: string;
  kind: MapPointKind;
  lat: number;
  lng: number;
  image?: string;
  detail?: string;
  time?: string;
  duration?: string;
  ticket?: string;
  order?: number;
};

export function routeCoordinateOrder(
  route: DayRoute,
  points: MapPoint[],
): [number, number][] {
  const byId = new Map(points.map((point) => [point.id, point]));
  if (!route.legs.length) return points
    .filter((point) => point.kind === 'stop' || point.kind === 'hotel')
    .map((point) => [point.lat, point.lng]);
  const ids = [route.legs[0].fromId, ...route.legs.map((leg) => leg.toId)];
  return ids.flatMap((id) => {
    const point = byId.get(id);
    return point ? [[point.lat, point.lng] as [number, number]] : [];
  });
}

export function legCoordinatePair(
  route: DayRoute,
  points: MapPoint[],
  legId: string | null,
): [number, number][] {
  if (!legId) return [];
  const leg = route.legs.find((item) => item.id === legId);
  if (!leg) return [];
  const byId = new Map(points.map((point) => [point.id, point]));
  const from = byId.get(leg.fromId);
  const to = byId.get(leg.toId);
  return from && to
    ? [[from.lat, from.lng], [to.lat, to.lng]]
    : [];
}
