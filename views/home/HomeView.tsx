'use client';

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { guideData } from '@/lib/data';
import type { ActionItem } from '@/lib/action-queue';
import { yuan } from '@/features/app/appModel';

export function HomeView({ daysLeft, nextAction, projectedBudget, actualTotal, unknownCosts, activeEntityCount, openTrip, openNextAction, openBudget }: {
  daysLeft: number | null; nextAction?: ActionItem; projectedBudget: number; actualTotal: number;
  unknownCosts: number; activeEntityCount: number; openTrip: () => void; openNextAction: () => void; openBudget: () => void;
}) {
  return <div className="v2-view home-v2">
    <section className="home-cover">
      <Image unoptimized src={guideData.trip.coverImage} alt="冬季欧洲街景" fill priority sizes="100vw" />
      <div className="cover-shade" />
      <div className="cover-copy"><span>EUROPE 2026</span><h1>Europe,<br />your way.</h1><p>18 Days · 6 Cities</p><button onClick={openTrip}>Continue Trip <ArrowRight /></button></div>
      <div className="countdown"><b>{daysLeft ?? '—'}</b><span>{daysLeft === null ? '行程倒计时' : '天后出发'}</span></div>
    </section>
    <div className="home-section-heading"><span>UPCOMING TRIP</span><h2>六座城市，一条冬日路线</h2></div>
    <section className="route-ribbon">{guideData.trip.cities.map((city) => <div key={city.id}><b>{city.name}</b><span>{city.country} · {city.nights}晚</span></div>)}</section>
    <section className="home-dashboard">
      <article className="home-next-action"><span>NEXT ACTION · {nextAction?.due ?? 'READY'}</span><h2>{nextAction?.title ?? '当前任务已完成'}</h2><p>{nextAction?.detail}</p><button onClick={openNextAction}>View next action <ArrowRight /></button></article>
      <article><span>TRIP BUDGET</span><h2>{yuan(projectedBudget)} / {yuan(actualTotal)}</h2><p>{unknownCosts}项费用待确认；Current Plan变更会自动重算</p><button onClick={openBudget}>View budget <ArrowRight /></button></article>
      <article><span>QUICK ACCESS</span><h2>{activeEntityCount} 个正式项目</h2><p>支持加入、备选、换天、排序、自定义与撤销。</p><button onClick={openTrip}>Open itinerary <ArrowRight /></button></article>
    </section>
  </div>;
}
