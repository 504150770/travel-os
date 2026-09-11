'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { guideData } from '@/lib/data';
import { normalizeRouteCity, type Entity } from '@/lib/entity-library';
import { useEditablePlan } from '@/hooks/use-editable-plan';
import { deriveCurrentDayState } from '@/lib/derive-current-day';
import type { Day } from '@/lib/types';
import type { AddMode } from '@/features/app/appModel';
import { dayRoutes, hotelForNight, realStays, routeCityForDay } from '@/features/trip/tripModel';

export function useTripController({ selectedDay, setSelectedDay, resolve, entities, actions, tomorrowAction }: {
  selectedDay: number; setSelectedDay: (day: number) => void;
  resolve: (id: string) => Entity | undefined; entities: Entity[];
  actions: ReturnType<typeof useEditablePlan>; tomorrowAction?: string;
}) {
  const day = guideData.days[selectedDay - 1] as Day;
  const planDay = actions.plan.days[selectedDay - 1];
  const route = dayRoutes[selectedDay - 1];
  const stay = hotelForNight(day.date) ?? realStays.find((item) => item.checkIn === day.date);
  const tomorrowFirst = actions.plan.days[selectedDay]?.activeItems[0];
  const tomorrowFirstName = tomorrowFirst ? resolve(tomorrowFirst.entityId)?.name : undefined;
  const tomorrow = selectedDay < 18
    ? `D${selectedDay + 1}${tomorrowFirstName ? ` · ${tomorrowFirstName}` : ''}${tomorrowAction ? `；待办：${tomorrowAction}` : ''}`
    : (tomorrowAction ?? '返程完成');
  const dayState = useMemo(() => deriveCurrentDayState({
    day, planDay, staticRoute: route, hotel: stay, resolve, tomorrowAction: tomorrow,
  }), [day, planDay, route, stay, resolve, tomorrow]);
  const [quick, setQuick] = useState<AddMode | null>(null);
  const [quickMenu, setQuickMenu] = useState(false);
  const [selectedGym, setSelectedGym] = useState<Entity | null>(null);
  const tripTopRef = useRef<HTMLDivElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);
  const fixedHero = guideData.images.find((image) => image.dayId === selectedDay && image.role === 'hero');
  const fallbackHero = planDay.activeItems.map((item) => resolve(item.entityId)).find((entity) => entity?.images.length)?.images[0];
  const hero = fixedHero ? { file: fixedHero.file, caption: fixedHero.caption } : fallbackHero;
  const optionalGyms = entities.filter((entity) =>
    entity.type === 'gym' && normalizeRouteCity(entity.city) === routeCityForDay(day) &&
    ((entity.raw.recommendedDays as number[] | undefined)?.includes(selectedDay) ?? false),
  ).sort((a, b) => Number(a.raw.hotelPriority ?? 99) - Number(b.raw.hotelPriority ?? 99)).slice(0, 2);
  const openQuick = (mode: AddMode) => { setQuickMenu(false); setQuick(mode); };
  const changeDay = (next: number) => { setSelectedDay(next); setQuickMenu(false); setSelectedGym(null); };

  useEffect(() => {
    const active = switcherRef.current?.querySelector<HTMLButtonElement>('[aria-current="date"]');
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    const timer = window.setTimeout(() => {
      if (tripTopRef.current) window.scrollTo({ top: Math.max(0, tripTopRef.current.offsetTop - 70), behavior: 'smooth' });
    }, 30);
    return () => window.clearTimeout(timer);
  }, [selectedDay]);

  return { day, planDay, stay, dayState, currentRoute: dayState.route, quick, setQuick,
    quickMenu, setQuickMenu, selectedGym, setSelectedGym, tripTopRef, switcherRef,
    hero, optionalGyms, openQuick, changeDay };
}
