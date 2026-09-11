'use client';

import { useEffect, useMemo, useState } from 'react';
import { useEditablePlan } from '@/hooks/use-editable-plan';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { readUrlState, useUrlState } from '@/hooks/use-url-state';
import { guideData } from '@/lib/data';
import { entityLibrary, entityMap, type Entity } from '@/lib/entity-library';
import { calculateBudget } from '@/lib/budget-calculator';
import { canonicalBookings } from '@/lib/hotel-execution';
import {
  buildActionQueue,
  checkinActionId,
  deadlineActionId,
  taskActionId,
} from '@/lib/action-queue';
import type { Booking, DeadlineItem, Task, ViewId } from '@/lib/types';
import type { GalleryRequest } from '@/lib/media';
import {
  cityNames,
  mergeBookingActionStatuses,
  type BackupPayload,
  type CustomEntity,
  type DiscoverTab,
  type MoreTab,
  type PlanTab,
} from '@/features/app/appModel';
import { realStays, todayDay } from '@/features/trip/tripModel';
import {
  desktopViewForMobile,
  desktopViewFromUrl,
  mobileViewFromUrl,
  type MobileView,
} from '@/features/mobile/mobileModel';

export function useAppController() {
  const [clock, setClock] = useState<Date | null>(null);
  const [view, setView] = useState<ViewId>('home');
  const [mobileView, setMobileView] = useState<MobileView>('today');
  const [selectedDay, setSelectedDay] = useState(1);
  const [planTab, setPlanTab] = useState<PlanTab>('bookings');
  const [moreTab, setMoreTab] = useState<MoreTab>('stay');
  const [discoverTab, setDiscoverTab] = useState<DiscoverTab>('places');
  const [discoverCity, setDiscoverCity] = useState('罗马');
  const [online, setOnline] = useState(true);
  const [lightbox, setLightbox] = useState<GalleryRequest | null>(null);
  const actions = useEditablePlan();
  const [customEntities, setCustomEntities] = useLocalStorage<CustomEntity[]>(
    'europe-guide-custom-entities-v1',
    [],
  );
  const [bookingStatuses, setBookingStatuses] = useLocalStorage<
    Record<string, string>
  >('europe-guide-booking-statuses', {});
  const [storedActionStatuses, setActionStatuses] = useLocalStorage<
    Record<string, string>
  >('europe-guide-action-statuses-v4', {});
  const [actuals, setActuals] = useLocalStorage<Record<string, number>>(
    'europe-guide-budget-actuals',
    { hotels: guideData.hotelBookings.summary.paidOnlineCny },
  );
  const [favorites, setFavorites] = useLocalStorage<Record<string, boolean>>(
    'europe-guide-favorites',
    {},
  );
  const [preferredTransport, setPreferredTransport] = useLocalStorage<
    Record<string, string>
  >('europe-guide-preferred-transport-v1', {});
  const [privateLinks, setPrivateLinks] = useLocalStorage<
    Record<string, string>
  >('europe-guide-private-checkin-links-v1', {});
  const [notes, setNotes] = useLocalStorage('europe-guide-notes', '');

  const actionStatuses = useMemo(
    () => mergeBookingActionStatuses(storedActionStatuses, bookingStatuses),
    [storedActionStatuses, bookingStatuses],
  );

  const applyUrl = () => {
    const state = readUrlState();
    if (state.view) {
      setView(desktopViewFromUrl(state.view));
      setMobileView(mobileViewFromUrl(state.view));
    }
    if (state.day >= 1 && state.day <= 18) setSelectedDay(state.day);
    if (
      [
        'bookings',
        'transport',
        'checkin',
        'deadlines',
        'tasks',
        'budget',
      ].includes(state.tab ?? '')
    )
      setPlanTab(state.tab as PlanTab);
    if (
      ['stay', 'routes', 'map', 'survival', 'essentials', 'backup'].includes(
        state.tab ?? '',
      )
    )
      setMoreTab(state.tab === 'routes' ? 'map' : (state.tab as MoreTab));
    if (
      ['places', 'food', 'gym', 'shopping', 'picks', 'photos'].includes(
        state.tab ?? '',
      )
    )
      setDiscoverTab(state.tab as DiscoverTab);
    if (cityNames.includes(state.city ?? '')) setDiscoverCity(state.city!);
    window.setTimeout(
      () =>
        window.scrollTo(
          0,
          Number(
            sessionStorage.getItem(
              `travel-scroll:${location.pathname}${location.search}`,
            ) ?? 0,
          ),
        ),
      0,
    );
  };
  const writeUrl = useUrlState(applyUrl);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = new Date();
      setClock(current);
      const url = readUrlState();
      if (url.view) applyUrl();
      else setSelectedDay(todayDay(current));
      const start = new Date(`${guideData.trip.startDate}T00:00:00`);
      const end = new Date(`${guideData.trip.endDate}T23:59:59`);
      if (!url.view && current >= start && current <= end) setView('trip');
      setOnline(navigator.onLine);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      const legacyTasks = JSON.parse(
        localStorage.getItem('europe-guide-task-statuses') ?? '{}',
      ) as Record<string, string>;
      const legacyDeadlines = JSON.parse(
        localStorage.getItem('travel-deadline-statuses-v1') ?? '{}',
      ) as Record<string, string>;
      const legacyCheckins = JSON.parse(
        localStorage.getItem('travel-checkin-completed-v1') ?? '{}',
      ) as Record<string, boolean>;
      if (
        !Object.keys(storedActionStatuses).length &&
        (Object.keys(legacyTasks).length ||
          Object.keys(legacyDeadlines).length ||
          Object.keys(legacyCheckins).length)
      ) {
        const migrated: Record<string, string> = {};
        Object.entries(legacyTasks).forEach(([id, status]) => {
          migrated[taskActionId(id)] = status;
        });
        (guideData.deadlines as DeadlineItem[]).forEach((item) => {
          if (legacyDeadlines[item.id])
            migrated[deadlineActionId(item)] = legacyDeadlines[item.id];
        });
        Object.entries(legacyCheckins).forEach(([id, done]) => {
          migrated[checkinActionId(id)] = done ? 'Done' : 'Waiting';
        });
        setActionStatuses(migrated);
      }
    } catch {
      // Leave unreadable legacy data untouched.
    }
  }, [storedActionStatuses, setActionStatuses]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    const timer = window.setTimeout(() => {
      const nodes = document.querySelectorAll<HTMLElement>(
        '.section-card, .editable-stop, .explore-card, .hotel-execution-card, .meal-group, .gym-option-card, .transit-execution',
      );
      observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer?.unobserve(entry.target);
            }
          }),
        { threshold: 0.08, rootMargin: '0px 0px -28px' },
      );
      nodes.forEach((node, index) => {
        node.classList.add('motion-reveal');
        node.style.setProperty('--reveal-index', `${index % 6}`);
        observer?.observe(node);
      });
    }, 40);
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [view, selectedDay, planTab, moreTab]);

  const entities = useMemo(
    () => [...entityLibrary, ...customEntities],
    [customEntities],
  );
  const resolve = (id: string) =>
    customEntities.find((entity) => entity.id === id) ?? entityMap.get(id);
  const addCustom = (
    entity: CustomEntity,
    target: 'activeItems' | 'alternatives',
    duration: string,
  ) => {
    setCustomEntities([...customEntities, entity]);
    actions.addEntity(entity.id, selectedDay, target, { duration });
  };
  const deleteCustom = (id: string) => {
    actions.deleteEntity(id);
    setCustomEntities(customEntities.filter((entity) => entity.id !== id));
  };
  const activeEntities = actions.plan.days
    .flatMap((day) => day.activeItems.map((item) => resolve(item.entityId)))
    .filter(Boolean) as Entity[];
  const bookings = canonicalBookings(
    realStays,
    guideData.bookings.items as Booking[],
  ).map((item) => ({
    ...item,
    status: bookingStatuses[item.id] ?? item.status,
  }));
  const budgetState = calculateBudget({
    budget: guideData.budget,
    bookings,
    plan: actions.plan,
    resolve,
  });
  const actionQueue = buildActionQueue({
    deadlines: guideData.deadlines as DeadlineItem[],
    tasks: guideData.tasks.items as Task[],
    stays: realStays,
    statuses: actionStatuses,
    bookingStatuses,
  });
  const displayActionStatuses = Object.fromEntries(
    actionQueue.map((item) => [item.id, item.status]),
  );
  const nextAction = actionQueue.find(
    (item) => !['Done', 'Skipped'].includes(item.status),
  );
  const actualTotal = Object.values(actuals).reduce(
    (sum, value) => sum + Number(value || 0),
    0,
  );

  const navigate = (next: ViewId) => {
    sessionStorage.setItem(
      `travel-scroll:${location.pathname}${location.search}`,
      String(window.scrollY),
    );
    setView(next);
    setMobileView(mobileViewFromUrl(next));
    const tab =
      next === 'plan'
        ? planTab
        : next === 'discover'
          ? discoverTab
          : next === 'more'
            ? moreTab === 'map'
              ? 'routes'
              : moreTab
            : null;
    writeUrl({
      view: next,
      day: next === 'trip' || next === 'more' ? selectedDay : null,
      tab,
      city: next === 'discover' ? discoverCity : null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const mobileTabValues = (next: MobileView) => ({
    view: next,
    day: selectedDay,
    tab:
      next === 'plan'
        ? planTab
        : next === 'explore'
          ? discoverTab
          : next === 'more'
            ? moreTab === 'map'
              ? 'routes'
              : moreTab
            : null,
    city: next === 'explore' ? discoverCity : null,
  });

  const navigateMobile = (next: MobileView) => {
    sessionStorage.setItem(
      `travel-mobile-scroll:${mobileView}:d${selectedDay}`,
      String(window.scrollY),
    );
    setMobileView(next);
    setView(desktopViewForMobile(next));
    writeUrl(mobileTabValues(next));
    window.setTimeout(() => {
      window.scrollTo({
        top: Number(
          sessionStorage.getItem(
            `travel-mobile-scroll:${next}:d${selectedDay}`,
          ) ?? 0,
        ),
        behavior: 'instant',
      });
    }, 0);
  };

  const backup: BackupPayload = {
    version: 4,
    exportedAt: new Date().toISOString(),
    currentItinerary: actions.plan,
    customEntities,
    bookingStatuses,
    actionStatuses,
    actuals,
    notes,
    favorites,
    preferredTransport,
  };
  const importBackup = (data: BackupPayload) => {
    if (![3, 4].includes(data.version))
      return window.alert('仅支持V3/V4旅行数据');
    localStorage.setItem(
      'europe-guide-current-itinerary-v1',
      JSON.stringify(data.currentItinerary),
    );
    setCustomEntities(data.customEntities ?? []);
    setBookingStatuses(data.bookingStatuses ?? {});
    const importedActions =
      data.actionStatuses ??
      Object.fromEntries(
        Object.entries(data.taskStatuses ?? {}).map(([id, status]) => [
          taskActionId(id),
          status,
        ]),
      );
    setActionStatuses(importedActions);
    setActuals(data.actuals ?? {});
    setNotes(data.notes ?? '');
    setFavorites(data.favorites ?? {});
    setPreferredTransport(data.preferredTransport ?? {});
    window.location.reload();
  };
  const daysLeft = clock
    ? Math.ceil(
        (new Date(`${guideData.trip.startDate}T00:00:00`).getTime() -
          clock.getTime()) /
          86400000,
      )
    : null;

  const selectTripDay = (day: number) => {
    setSelectedDay(day);
    writeUrl({ view: 'trip', day, tab: null, city: null });
  };
  const selectMobileDay = (day: number) => {
    setSelectedDay(day);
    writeUrl({ ...mobileTabValues(mobileView), day }, 'replace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const selectMobileDiscoverTab = (tab: DiscoverTab) => {
    setDiscoverTab(tab);
    writeUrl({ view: 'explore', day: selectedDay, tab, city: discoverCity });
  };
  const selectMobileDiscoverCity = (city: string) => {
    setDiscoverCity(city);
    writeUrl({ view: 'explore', day: selectedDay, tab: discoverTab, city });
  };
  const selectMobilePlanTab = (tab: PlanTab) => {
    setPlanTab(tab);
    writeUrl({ view: 'plan', day: selectedDay, tab, city: null });
  };
  const selectMobileMoreTab = (tab: MoreTab) => {
    setMoreTab(tab);
    writeUrl({
      view: 'more',
      day: selectedDay,
      tab: tab === 'map' ? 'routes' : tab,
      city: null,
    });
  };
  const selectDiscoverTab = (tab: DiscoverTab) => {
    setDiscoverTab(tab);
    writeUrl({ view: 'discover', tab, city: discoverCity, day: null });
  };
  const selectDiscoverCity = (city: string) => {
    setDiscoverCity(city);
    writeUrl({ view: 'discover', tab: discoverTab, city, day: null });
  };
  const selectPlanTab = (tab: PlanTab) => {
    setPlanTab(tab);
    writeUrl({ view: 'plan', tab, day: null, city: null });
  };
  const selectMoreTab = (tab: MoreTab) => {
    setMoreTab(tab);
    writeUrl({
      view: 'more',
      tab: tab === 'map' ? 'routes' : tab,
      day: selectedDay,
      city: null,
    });
  };
  const selectMoreDay = (day: number) => {
    setSelectedDay(day);
    writeUrl({
      view: 'more',
      tab: moreTab === 'map' ? 'routes' : moreTab,
      day,
      city: null,
    });
  };
  const openNextAction = () => {
    navigate('plan');
    const target = nextAction?.target ?? 'tasks';
    setPlanTab(target);
    writeUrl(
      { view: 'plan', tab: target, day: null, city: null },
      'replace',
    );
  };
  const openBudget = () => {
    navigate('plan');
    setPlanTab('budget');
  };

  return {
    clock,
    view,
    mobileView,
    selectedDay,
    planTab,
    moreTab,
    discoverTab,
    discoverCity,
    online,
    lightbox,
    setLightbox,
    actions,
    entities,
    resolve,
    addCustom,
    deleteCustom,
    bookingStatuses,
    setBookingStatuses,
    actionStatuses: displayActionStatuses,
    setActionStatuses,
    actuals,
    setActuals,
    favorites,
    setFavorites,
    preferredTransport,
    setPreferredTransport,
    privateLinks,
    setPrivateLinks,
    notes,
    setNotes,
    budgetState,
    activeEntities,
    nextAction,
    actualTotal,
    daysLeft,
    backup,
    importBackup,
    navigate,
    navigateMobile,
    selectTripDay,
    selectMobileDay,
    selectMobileDiscoverTab,
    selectMobileDiscoverCity,
    selectMobilePlanTab,
    selectMobileMoreTab,
    selectDiscoverTab,
    selectDiscoverCity,
    selectPlanTab,
    selectMoreTab,
    selectMoreDay,
    openNextAction,
    openBudget,
  };
}

export type AppController = ReturnType<typeof useAppController>;
