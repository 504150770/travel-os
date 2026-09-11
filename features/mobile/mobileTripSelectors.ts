import type { Entity } from '@/lib/entity-library';
import type { PlanDay } from '@/hooks/use-editable-plan';
import type { Day, HotelBooking } from '@/lib/types';
import type { MobileMapPoint } from '@/features/mobile/mobileModel';
import { selectDayMapPoints, selectRelevantFood } from '@/features/map/mapSelectors';

export function mobileFoodPicks({
  entities,
  day,
  planDay,
}: {
  entities: Entity[];
  day: Day;
  planDay: PlanDay;
}) {
  return selectRelevantFood({ entities, day, planDay });
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
  return selectDayMapPoints({
    stay,
    planDay,
    resolve,
    food: food.slice(0, 1),
    gyms: gym ? [gym] : [],
  }) as MobileMapPoint[];
}
