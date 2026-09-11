'use client';

import { Check } from 'lucide-react';
import { guideData } from '@/lib/data';
import type { Day } from '@/lib/types';
import { routeCityForDay } from '@/features/trip/tripModel';
import { MobileSheet } from '@/components/mobile/MobileSheet';

export function MobileDayPicker({
  open,
  close,
  selectedDay,
  selectDay,
}: {
  open: boolean;
  close: () => void;
  selectedDay: number;
  selectDay: (day: number) => void;
}) {
  return (
    <MobileSheet
      open={open}
      close={close}
      eyebrow="EUROPE 2026"
      title="选择旅行日"
      className="mobile-day-sheet"
    >
      <div className="mobile-day-list">
        {guideData.days.map((item) => (
          <button
            key={item.day}
            aria-current={item.day === selectedDay ? 'date' : undefined}
            onClick={() => {
              selectDay(item.day);
              close();
            }}
          >
            <b>D{item.day}</b>
            <span>
              {routeCityForDay(item as Day)} · {item.date.slice(5)}
            </span>
            <small>{item.theme}</small>
            {item.day === selectedDay && <Check />}
          </button>
        ))}
      </div>
    </MobileSheet>
  );
}
