import type { Booking } from '@/lib/types';
import type { EditablePlan } from '@/hooks/use-editable-plan';
import type { Entity } from '@/lib/entity-library';

type BudgetData = {
  hardCap: number;
  planTotal: number;
  shoppingFloor: number;
  fixedCommitted: { amount: number };
  categories: { id: string; budget: number }[];
};

export function calculateBudget({
  budget,
  bookings,
  plan,
  resolve,
}: {
  budget: BudgetData;
  bookings: Booking[];
  plan: EditablePlan;
  resolve: (id: string) => Entity | undefined;
}) {
  const activeIds = new Set(
    plan.days.flatMap((day) => day.activeItems.map((item) => item.entityId)),
  );
  const aliases: Record<string, string[]> = {
    vatican: ['vatican_museums'],
    stmark: ['st_mark_basilica'],
    praguecastle: ['prague_castle', 'st_vitus'],
    arc: ['arc_triomphe'],
  };
  const isActive = (id: string) =>
    activeIds.has(id) ||
    (aliases[id] ?? []).some((entityId) => activeIds.has(entityId));
  const alternativeEntities = plan.days
    .flatMap((day) => day.alternatives.map((item) => resolve(item.entityId)))
    .filter(Boolean) as Entity[];
  const attractionBookings = bookings.filter(
    (item) => item.category === '景点票',
  );
  const removedCoreCost = attractionBookings
    .filter(
      (item) =>
        !isActive(item.id) &&
        !['Paid', 'Booked', 'Confirmed', 'Completed'].includes(item.status),
    )
    .reduce((sum, item) => sum + item.budget, 0);
  const matchedBookingIds = new Set(
    bookings.flatMap((item) => [item.id, ...(aliases[item.id] ?? [])]),
  );
  const addedKnown = plan.days
    .flatMap((day) => day.activeItems.map((item) => resolve(item.entityId)))
    .filter(
      (entity): entity is Entity =>
        Boolean(entity) && !matchedBookingIds.has(entity!.id),
    )
    .reduce((sum, entity) => sum + (entity.projectedCostCny ?? 0), 0);
  const unknown = plan.days
    .flatMap((day) => day.activeItems.map((item) => resolve(item.entityId)))
    .filter((entity): entity is Entity => Boolean(entity))
    .filter(
      (entity) => entity.type !== 'activity' && entity.projectedCostCny == null,
    ).length;
  const reserve =
    budget.shoppingFloor +
    (budget.categories.find((item) => item.id === 'china_buffer')?.budget ?? 0);
  const committed =
    budget.fixedCommitted.amount +
    bookings
      .filter(
        (item) =>
          item.category !== '酒店' &&
          ['Booked', 'Paid', 'Confirmed', 'Completed'].includes(item.status),
      )
      .reduce((sum, item) => sum + item.budget, 0);
  const projected = Math.max(
    committed + reserve,
    budget.planTotal - removedCoreCost + addedKnown,
  );
  const planned = Math.max(0, projected - committed - reserve);
  const uniqueAlternatives = [
    ...new Map(
      alternativeEntities
        .filter((entity) => !activeIds.has(entity.id))
        .map((entity) => [entity.id, entity]),
    ).values(),
  ];
  const optional = uniqueAlternatives.reduce(
    (sum, entity) => sum + (entity.projectedCostCny ?? 0),
    0,
  );
  return {
    committed,
    planned,
    optional,
    reserve,
    projected,
    unknown,
    remaining: budget.hardCap - projected,
  };
}
