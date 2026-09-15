import { normalizeRouteCity, type Entity } from '@/lib/entity-library';
import type { PlanDay } from '@/hooks/use-editable-plan';
import type { Day, HotelBooking } from '@/lib/types';
import type { MapPoint } from '@/features/map/mapModel';

export function selectRelevantFood({
  entities,
  day,
  planDay,
  limit = 3,
}: {
  entities: Entity[];
  day: Day;
  planDay: PlanDay;
  limit?: number;
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
    .slice(0, limit);
}

export function selectRelevantGyms({
  entities,
  day,
  limit = 2,
}: {
  entities: Entity[];
  day: Day;
  limit?: number;
}) {
  return entities
    .filter(
      (entity) =>
        entity.type === 'gym' &&
        normalizeRouteCity(entity.city) === normalizeRouteCity(day.city) &&
        ((entity.raw.recommendedDays as number[] | undefined)?.includes(day.day) ?? false),
    )
    .sort((a, b) => Number(a.raw.hotelPriority ?? 99) - Number(b.raw.hotelPriority ?? 99))
    .slice(0, limit);
}

export function selectDayMapPoints({
  stay,
  planDay,
  resolve,
  food = [],
  gyms = [],
  candidates = [],
}: {
  stay?: HotelBooking;
  planDay: PlanDay;
  resolve: (id: string) => Entity | undefined;
  food?: Entity[];
  gyms?: Entity[];
  candidates?: Entity[];
}): MapPoint[] {
  const points: MapPoint[] = [];
  if (stay?.coordinates) {
    points.push({
      id: stay.id,
      name: stay.hotelName,
      kind: 'hotel',
      lat: stay.coordinates.lat,
      lng: stay.coordinates.lng,
      image: stay.images.find((image) => image.role === 'entrance')?.file ??
        stay.images.find((image) => image.isCover)?.file ??
        stay.images.find((image) => image.file)?.file ?? undefined,
      detail: 'Tonight stay',
    });
  }
  let stopOrder = 0;
  planDay.activeItems.forEach((item) => {
    const entity = resolve(item.entityId);
    if (!entity?.coordinates || entity.type === 'activity') return;
    stopOrder += 1;
    points.push({
      id: entity.id,
      entityId: entity.id,
      name: entity.name,
      kind: 'stop',
      lat: entity.coordinates.lat,
      lng: entity.coordinates.lng,
      image: entity.images[0]?.file,
      detail: `${item.time} · ${item.duration}`,
      time: item.time,
      duration: item.duration,
      ticket: item.ticket,
      order: stopOrder,
    });
  });
  const append = (entities: Entity[], kind: 'food' | 'gym' | 'candidate') => {
    entities.forEach((entity) => {
      if (!entity.coordinates || points.some((point) => point.id === entity.id)) return;
      points.push({
        id: entity.id,
        entityId: entity.id,
        name: entity.name,
        kind,
        lat: entity.coordinates.lat,
        lng: entity.coordinates.lng,
        image: entity.images[0]?.file,
        detail: kind === 'food' ? 'Route food pick' : kind === 'gym' ? 'Gym option' : entity.type,
      });
    });
  };
  append(food, 'food');
  append(gyms, 'gym');
  append(candidates, 'candidate');
  return points;
}
