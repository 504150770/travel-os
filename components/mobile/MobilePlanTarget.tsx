'use client';

import { guideData } from '@/lib/data';
import type { Day } from '@/lib/types';
import { routeCityForDay } from '@/features/trip/tripModel';
import '@/components/mobile/mobile-explore.css';

export function MobilePlanTarget({ selectedDay, selectDay }: {
  selectedDay: number;
  selectDay: (day: number) => void;
}) {
  return (
    <label className="mobile-plan-target">
      <span>加入目标</span>
      <select aria-label="选择加入的旅行日" value={selectedDay} onChange={(event) => selectDay(Number(event.target.value))}>
        {guideData.days.map((day) => <option key={day.day} value={day.day}>
          Day {day.day} · {routeCityForDay(day as Day)} · {day.date.slice(5).replace('-', '/')}
        </option>)}
      </select>
    </label>
  );
}
