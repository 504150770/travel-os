'use client';

import { lazy, Suspense, useState } from 'react';
import { CalendarDays, ClipboardList, Compass, Map, Menu, WifiOff } from 'lucide-react';
import type { AppController } from '@/features/app/useAppController';
import type { MobileView } from '@/features/mobile/mobileModel';
import { guideData } from '@/lib/data';
import type { Day } from '@/lib/types';
import { routeCityForDay } from '@/features/trip/tripModel';
import { MobileTripWorkspace } from '@/components/mobile/MobileTripWorkspace';
import { MobileDayPicker } from '@/components/mobile/MobileDayPicker';
import '@/components/mobile/mobile.css';

const MobileExplore = lazy(async () => {
  const loaded = await import('@/components/mobile/MobileExplore');
  return { default: loaded.MobileExplore };
});
const MobilePlan = lazy(async () => {
  const loaded = await import('@/components/mobile/MobilePlan');
  return { default: loaded.MobilePlan };
});
const MobileMore = lazy(async () => {
  const loaded = await import('@/components/mobile/MobileMore');
  return { default: loaded.MobileMore };
});

const mobileNav: Array<{
  id: MobileView;
  label: string;
  icon: typeof CalendarDays;
}> = [
  { id: 'today', label: 'Today', icon: CalendarDays },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'plan', label: 'Plan', icon: ClipboardList },
  { id: 'more', label: 'More', icon: Menu },
];

export function MobileShell({ controller }: { controller: AppController }) {
  const [dayPicker, setDayPicker] = useState(false);
  const day = guideData.days[controller.selectedDay - 1] as Day;
  const tripSurface =
    controller.mobileView === 'today' || controller.mobileView === 'map';
  return (
    <div className="mobile-execution-shell">
      {!controller.online && (
        <div className="mobile-offline-badge">
          <WifiOff /> Offline · saved trip available
        </div>
      )}
      {controller.mobileView === 'map' && (
        <header className="mobile-map-topbar">
          <div>
            <span>{routeCityForDay(day).toUpperCase()}</span>
            <b>
              Day {day.day} · {day.date.slice(5).replace('-', '/')}
            </b>
          </div>
          <button onClick={() => setDayPicker(true)}>D{day.day} ▾</button>
        </header>
      )}
      <Suspense fallback={<div className="mobile-screen-loading">Loading…</div>}>
        {tripSurface ? (
          <MobileTripWorkspace
            controller={controller}
            openDayPicker={() => setDayPicker(true)}
          />
        ) : controller.mobileView === 'explore' ? (
          <MobileExplore controller={controller} />
        ) : controller.mobileView === 'plan' ? (
          <MobilePlan controller={controller} />
        ) : (
          <MobileMore controller={controller} />
        )}
      </Suspense>
      <nav className="mobile-bottom-dock" aria-label="Mobile navigation">
        {mobileNav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={controller.mobileView === id ? 'active' : ''}
            aria-current={controller.mobileView === id ? 'page' : undefined}
            onClick={() => controller.navigateMobile(id)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <MobileDayPicker
        open={dayPicker}
        close={() => setDayPicker(false)}
        selectedDay={controller.selectedDay}
        selectDay={controller.selectMobileDay}
      />
    </div>
  );
}
