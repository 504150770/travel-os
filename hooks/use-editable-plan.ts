'use client';

import { useEffect, useMemo, useState } from 'react';
import originalPlan from '@/data/day-plans.json';
import { useLocalStorage } from '@/hooks/use-local-storage';
import {
  migrateEditablePlan,
  reorderPlanItems,
} from '@/features/trip/planModel';

export type PlanItem = {
  id: string;
  entityId: string;
  order: number;
  time: string;
  duration: string;
  status: string;
  notes: string;
  guard: string;
  ticket: string;
};
export type PlanDay = {
  dayId: number;
  activeItems: PlanItem[];
  alternatives: PlanItem[];
  removedItems?: PlanItem[];
};
export type EditablePlan = {
  version: number;
  originalPlanId: string;
  days: PlanDay[];
};

const pristine = originalPlan as EditablePlan;
const normalize = (plan: EditablePlan): EditablePlan => ({
  ...plan,
  days: plan.days.map((day) => ({
    ...day,
    removedItems: day.removedItems ?? [],
  })),
});

export function useEditablePlan() {
  const [stored, setStored] = useLocalStorage<EditablePlan>(
    'europe-guide-current-itinerary-v1',
    normalize(pristine),
  );
  const plan = useMemo(
    () => normalize(migrateEditablePlan(stored, pristine)),
    [stored],
  );
  useEffect(() => {
    if (stored.originalPlanId !== plan.originalPlanId) setStored(plan);
  }, [plan, setStored, stored.originalPlanId]);
  const [undo, setUndo] = useState<{
    plan: EditablePlan;
    label: string;
  } | null>(null);
  const commit = (next: EditablePlan, label: string) => {
    setUndo({ plan, label });
    setStored(normalize(next));
  };
  const updateDay = (
    dayId: number,
    updater: (day: PlanDay) => PlanDay,
    label: string,
  ) =>
    commit(
      {
        ...plan,
        days: plan.days.map((day) =>
          day.dayId === dayId ? updater(day) : day,
        ),
      },
      label,
    );
  const reindex = (items: PlanItem[]) =>
    items.map((item, index) => ({ ...item, order: index + 1 }));

  const moveWithin = (dayId: number, itemId: string, direction: -1 | 1) =>
    updateDay(
      dayId,
      (day) => {
        const index = day.activeItems.findIndex((item) => item.id === itemId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= day.activeItems.length)
          return day;
        const items = [...day.activeItems];
        [items[index], items[target]] = [items[target], items[index]];
        return { ...day, activeItems: reindex(items) };
      },
      direction < 0 ? '上移项目' : '下移项目',
    );

  const reorderWithin = (dayId: number, activeId: string, overId: string) =>
    updateDay(
      dayId,
      (day) => ({
        ...day,
        activeItems: reorderPlanItems(day.activeItems, activeId, overId),
      }),
      '调整行程顺序',
    );

  const transfer = (
    dayId: number,
    itemId: string,
    from: 'activeItems' | 'alternatives' | 'removedItems',
    to: 'activeItems' | 'alternatives' | 'removedItems',
  ) =>
    updateDay(
      dayId,
      (day) => {
        const source = day[from] ?? [];
        const item = source.find((row) => row.id === itemId);
        if (!item) return day;
        const target = day[to] ?? [];
        return {
          ...day,
          [from]: reindex(source.filter((row) => row.id !== itemId)),
          [to]: reindex([
            ...target,
            {
              ...item,
              status:
                to === 'activeItems'
                  ? 'planned'
                  : to === 'alternatives'
                    ? 'backup'
                    : 'removed',
            },
          ]),
        };
      },
      to === 'alternatives'
        ? '移到备选'
        : to === 'activeItems'
          ? '加入行程'
          : '从当天移除',
    );

  const moveDay = (
    fromDayId: number,
    itemId: string,
    targetDayId: number,
    source: 'activeItems' | 'alternatives' = 'activeItems',
  ) => {
    const from = plan.days.find((day) => day.dayId === fromDayId);
    const item = from?.[source].find((row) => row.id === itemId);
    if (!item || fromDayId === targetDayId) return;
    const next = {
      ...plan,
      days: plan.days.map((day) => {
        if (day.dayId === fromDayId)
          return {
            ...day,
            [source]: reindex(day[source].filter((row) => row.id !== itemId)),
          };
        if (day.dayId === targetDayId)
          return {
            ...day,
            activeItems: reindex([
              ...day.activeItems,
              {
                ...item,
                id: `${item.id}-d${targetDayId}-${Date.now()}`,
                status: 'planned',
              },
            ]),
          };
        return day;
      }),
    };
    commit(next, `移动到 Day ${targetDayId}`);
  };

  const addEntity = (
    entityId: string,
    dayId: number,
    target: 'activeItems' | 'alternatives',
    defaults?: Partial<PlanItem>,
  ) => {
    const next = {
      ...plan,
      days: plan.days.map((day) => {
        if (day.dayId !== dayId) return day;
        const cleared = {
          ...day,
          activeItems: day.activeItems.filter(
            (item) => item.entityId !== entityId,
          ),
          alternatives: day.alternatives.filter(
            (item) => item.entityId !== entityId,
          ),
          removedItems: (day.removedItems ?? []).filter(
            (item) => item.entityId !== entityId,
          ),
        };
        const item: PlanItem = {
          id: `user-${entityId}-d${dayId}-${Date.now()}`,
          entityId,
          order: cleared[target].length + 1,
          time: defaults?.time ?? '待安排',
          duration: defaults?.duration ?? '待确认',
          status: target === 'activeItems' ? 'planned' : 'backup',
          notes: defaults?.notes ?? '',
          guard: '',
          ticket: '待确认',
        };
        return { ...cleared, [target]: [...cleared[target], item] };
      }),
    };
    commit(
      next,
      target === 'activeItems' ? `加入 Day ${dayId}` : `加入 Day ${dayId} 备选`,
    );
  };

  const updateItem = (
    dayId: number,
    itemId: string,
    patch: Partial<PlanItem>,
  ) =>
    updateDay(
      dayId,
      (day) => ({
        ...day,
        activeItems: day.activeItems.map((item) =>
          item.id === itemId ? { ...item, ...patch } : item,
        ),
      }),
      '修改时间',
    );
  const resetDay = (dayId: number) =>
    updateDay(
      dayId,
      () => normalize(pristine).days.find((day) => day.dayId === dayId)!,
      `重置 Day ${dayId}`,
    );
  const resetTrip = () => commit(normalize(pristine), '恢复原始计划');
  const deleteEntity = (entityId: string) =>
    commit(
      {
        ...plan,
        days: plan.days.map((day) => ({
          ...day,
          activeItems: day.activeItems.filter(
            (item) => item.entityId !== entityId,
          ),
          alternatives: day.alternatives.filter(
            (item) => item.entityId !== entityId,
          ),
          removedItems: (day.removedItems ?? []).filter(
            (item) => item.entityId !== entityId,
          ),
        })),
      },
      '删除自定义项目',
    );
  const undoLast = () => {
    if (!undo) return;
    setStored(undo.plan);
    setUndo(null);
  };
  const placement = (entityId: string, preferredDayId?: number) => {
    const matches = plan.days.flatMap((day) => [
      ...day.activeItems
        .filter((item) => item.entityId === entityId)
        .map(() => ({ dayId: day.dayId, zone: 'trip' as const })),
      ...day.alternatives
        .filter((item) => item.entityId === entityId)
        .map(() => ({ dayId: day.dayId, zone: 'backup' as const })),
    ]);
    if (preferredDayId !== undefined)
      return matches.find((item) => item.dayId === preferredDayId) ?? null;
    return matches.find((item) => item.zone === 'trip') ?? matches[0] ?? null;
  };

  return {
    plan,
    originalPlan: normalize(pristine),
    undo,
    undoLast,
    moveWithin,
    reorderWithin,
    transfer,
    moveDay,
    addEntity,
    updateItem,
    resetDay,
    resetTrip,
    deleteEntity,
    placement,
  };
}
