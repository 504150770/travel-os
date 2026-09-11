import { normalizeRouteCity, type Entity } from '@/lib/entity-library';
import type { PlanDay } from '@/hooks/use-editable-plan';
import type { Day, HotelBooking } from '@/lib/types';
import type { MobileMapPoint } from '@/features/mobile/mobileModel';

export function mobileFoodPicks({
  entities,
  day,
  planDay,
}: {
  entities: Entity[];
  day: Day;
  planDay: PlanDay;
}) {
  const active = new Set(planDay.activeItems.map((item) => item.entityId));
  return entities
    .filter(
      (entity) =>
        ['restaurant', 'cafe'].includes(entity.type) &&
        normalizeRouteCity(entity.city) === normalizeRouteCity(day.city) &&
        ((entity.raw.recommendedDays as number[] | undefined)?.includes(day.day) ?? false),
    )
    .sort(
      (a, b) =>
        Number(!active.has(a.id)) - Number(!active.has(b.id)) ||
        Number(a.raw.hotelPriority ?? 99) - Number(b.raw.hotelPriority ?? 99),
    )
    .slice(0, 3);
}

export function mobileMapPoints({
  stay,
  planDay,
  resolve,
  food,
  gym,
}: {
  stay?: HotelBooking;
  planDay: PlanDay;
  resolve: (id: string) => Entity | undefined;
  food: Entity[];
  gym?: Entity;
}): MobileMapPoint[] {
  const points: MobileMapPoint[] = [];
  if (stay?.coordinates) {
    points.push({
      id: stay.id,
      entityId: stay.id,
      name: stay.hotelName,
      kind: 'hotel',
      lat: stay.coordinates.lat,
      lng: stay.coordinates.lng,
      image: stay.images.find((image) => image.isCover)?.file ??
        stay.images.find((image) => image.file)?.file ?? undefined,
      detail: 'Tonight stay',
    });
  }
  for (const item of planDay.activeItems) {
    const entity = resolve(item.entityId);
    if (!entity?.coordinates || entity.type === 'activity') continue;
    points.push({
      id: entity.id,
      entityId: entity.id,
      name: entity.name,
      kind: 'stop',
      lat: entity.coordinates.lat,
      lng: entity.coordinates.lng,
      image: entity.images[0]?.file,
      detail: `${item.time} · ${item.duration}`,
    });
  }
  for (const [entity, kind] of [
    [food[0], 'food'],
    [gym, 'gym'],
  ] as const) {
    if (!entity?.coordinates || points.some((point) => point.id === entity.id)) continue;
    points.push({
      id: entity.id,
      entityId: entity.id,
      name: entity.name,
      kind,
      lat: entity.coordinates.lat,
      lng: entity.coordinates.lng,
      image: entity.images[0]?.file,
      detail: kind === 'food' ? 'Best for today' : 'Gym tonight',
    });
  }
  return points;
}
