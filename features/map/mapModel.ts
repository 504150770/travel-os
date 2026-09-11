import type { DayRoute } from '@/lib/types';

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
