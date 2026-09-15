import type { EditablePlan, PlanDay, PlanItem } from '@/hooks/use-editable-plan';

export function reorderPlanItems<T extends { id: string; order: number }>(
  items: T[],
  activeId: string,
  overId: string,
): T[] {
  const from = items.findIndex((item) => item.id === activeId);
  const to = items.findIndex((item) => item.id === overId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.map((item, index) => ({ ...item, order: index + 1 }));
}

const PREVIOUS_OFFICIAL_PLAN_ID = 'winter-europe-2026-v1';
const UPDATED_OFFICIAL_DAYS = new Set([7, 8, 10, 14, 15]);
const isUserItem = (item: PlanItem) => item.id.startsWith('user-');
const reindex = (items: PlanItem[]) =>
  items.map((item, index) => ({ ...item, order: index + 1 }));

function mergeUserItems(
  official: PlanItem[],
  stored: PlanItem[] = [],
): PlanItem[] {
  const officialEntities = new Set(official.map((item) => item.entityId));
  return reindex([
    ...official,
    ...stored.filter(
      (item) => isUserItem(item) && !officialEntities.has(item.entityId),
    ),
  ]);
}

function migrateDay(stored: PlanDay, official: PlanDay): PlanDay {
  return {
    ...official,
    activeItems: mergeUserItems(official.activeItems, stored.activeItems),
    alternatives: mergeUserItems(official.alternatives, stored.alternatives),
    removedItems: mergeUserItems(
      official.removedItems ?? [],
      stored.removedItems ?? [],
    ),
  };
}

export function migrateEditablePlan(
  stored: EditablePlan,
  official: EditablePlan,
): EditablePlan {
  if (stored.originalPlanId !== PREVIOUS_OFFICIAL_PLAN_ID) return stored;
  const officialByDay = new Map(official.days.map((day) => [day.dayId, day]));
  return {
    ...stored,
    version: official.version,
    originalPlanId: official.originalPlanId,
    days: stored.days.map((day) => {
      const next = officialByDay.get(day.dayId);
      return next && UPDATED_OFFICIAL_DAYS.has(day.dayId)
        ? migrateDay(day, next)
        : day;
    }),
  };
}
