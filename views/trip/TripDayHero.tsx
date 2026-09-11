import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import type { Day } from '@/lib/types';

export function TripDayHero({ day, hero }: {
  day: Day;
  hero?: { file: string; caption: string };
}) {
  return (
    <section className="day-hero">
      {hero ? (
        <Image unoptimized key={hero.file} src={hero.file} alt={hero.caption} fill priority sizes="100vw" />
      ) : (
        <div className="hero-pending"><ImageIcon /> PHOTO PENDING</div>
      )}
      <div className="day-hero-shade" />
      <div>
        <span>MY CURRENT PLAN · DAY {String(day.day).padStart(2, '0')}</span>
        <h1>{day.theme}</h1>
        <p>{day.city} · {day.pace} · {day.walking}</p>
      </div>
    </section>
  );
}
