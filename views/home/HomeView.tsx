'use client';

import Image from 'next/image';
import { ArrowRight, CalendarDays, CheckSquare2, MapPinned, Route, WalletCards } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { guideData } from '@/lib/data';
import type { ActionItem } from '@/lib/action-queue';
import { yuan } from '@/features/app/appModel';
import { routeCityForDay } from '@/features/trip/tripModel';
import type { Day } from '@/lib/types';

const HOME_HERO = '/images/home-eiffel-winter-sunset.png';
const HOME_HERO_MOBILE = '/images/home-eiffel-winter-mobile.webp';
const HOME_HERO_WEBP = '/images/home-eiffel-winter-sunset-lossless.webp';
const cityCovers: Record<string, string> = {
  rome: '/images/home-city-rome.webp',
  florence: '/images/home-city-florence.webp',
  venice: '/images/home-city-venice.webp',
  vienna: '/images/home-city-vienna.webp',
  prague: '/images/home-city-prague.webp',
  paris: '/images/home-city-paris.webp',
};

function useHomePerformanceMarks() {
  const homeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = homeRef.current;
    if (!node) return;
    node.dataset.homeMountedAt = String(Math.round(performance.now()));
    const updateLoadMarks = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (navigation) node.dataset.homeTtfbMs = String(Math.round(navigation.responseStart));
      const scripts = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
        .filter((entry) => /\.js(?:\?|$)/.test(entry.name));
      node.dataset.homeJsReadyMs = String(Math.round(Math.max(0, ...scripts.map((entry) => entry.responseEnd))));
      node.dataset.homeJsTransferBytes = String(scripts.reduce((sum, entry) => sum + entry.transferSize, 0));
    };
    updateLoadMarks();
    if (!('PerformanceObserver' in window)) return;
    const observer = new PerformanceObserver((list) => {
      const entry = list.getEntries().at(-1);
      if (entry) node.dataset.homeLcpMs = String(Math.round(entry.startTime));
      updateLoadMarks();
    });
    try { observer.observe({ type: 'largest-contentful-paint', buffered: true }); }
    catch { return; }
    return () => observer.disconnect();
  }, []);
  return homeRef;
}

export function HomeView({ daysLeft, selectedDay, nextAction, projectedBudget, actualTotal, unknownCosts, activeEntityCount, openTrip, openCityTrip, openNextAction, openReadiness, openBudget }: {
  daysLeft: number | null; nextAction?: ActionItem; projectedBudget: number; actualTotal: number;
  selectedDay: number; unknownCosts: number; activeEntityCount: number; openTrip: () => void; openCityTrip: (city: string) => void; openNextAction: () => void; openReadiness: () => void; openBudget: () => void;
}) {
  const homeRef = useHomePerformanceMarks();
  const day = guideData.days.find((item) => item.day === selectedDay) as Day | undefined;
  const tripPhase = daysLeft === null ? 'pending' : daysLeft > 0 ? 'upcoming' : daysLeft > -guideData.days.length ? 'traveling' : 'past';
  const tripDates = `${guideData.trip.startDate.slice(5).replace('-', '/')}–${guideData.trip.endDate.slice(5).replace('-', '/')}`;
  const actionLabel = nextAction?.target === 'checkin' ? '查看入住' : nextAction?.target === 'deadlines' ? '查看关键日期' : '查看待办';
  return <div ref={homeRef} className="v2-view home-v2" data-home-view>
    <section className="home-cover" data-home-hero>
      <picture className="home-cover-media">
        <source media="(max-width: 767px)" srcSet={HOME_HERO_MOBILE} />
        <source type="image/webp" srcSet={HOME_HERO_WEBP} />
        <img
          src={HOME_HERO}
          alt="冬日落日下的巴黎埃菲尔铁塔与塞纳河"
          fetchPriority="high"
          loading="eager"
          onLoad={() => { if (homeRef.current) homeRef.current.dataset.homeHeroLoadedMs = String(Math.round(performance.now())); }}
        />
      </picture>
      <div className="cover-shade" />
      <div className="cover-copy">
        <span>EUROPE 2026</span>
        <h1>Six cities,<br />one winter journey.</h1>
        <p className="home-route-line">Rome · Florence · Venice · Vienna · Prague · Paris</p>
        <p className="home-trip-facts">18 Days · 6 Cities</p>
        <button onClick={openTrip}>{day ? `查看 Day ${day.day} · ${routeCityForDay(day)}` : '查看行程'} <ArrowRight /></button>
      </div>
      <div className="countdown">
        <CalendarDays />
        <b>{tripPhase === 'upcoming' ? daysLeft : tripPhase === 'traveling' ? '旅程进行中' : tripPhase === 'past' ? '旅程回顾' : '—'}</b>
        <span>{tripPhase === 'upcoming' ? '天后出发' : tripPhase === 'pending' ? '行程倒计时' : tripDates}</span>
      </div>
    </section>

    <section className="home-dashboard">
      <article className="home-next-action">
        <div className="home-card-icon"><CheckSquare2 /></div>
        <div className="home-action-copy">
          <span>{nextAction ? `NEXT ACTION · ${nextAction.due}` : 'TRIP READINESS'}</span>
          <h2>{nextAction?.title ?? '当前暂无待办'}</h2>
          <p>{nextAction?.detail ?? '查看出发准备，确认票据、资料与行李。'}</p>
          <button onClick={nextAction ? openNextAction : openReadiness}>{nextAction ? actionLabel : '查看出发准备'} <ArrowRight /></button>
        </div>
        <div className="home-paper-art" aria-hidden="true"><MapPinned /><span /><span /><span /></div>
      </article>
      <article className="home-compact-card">
        <div className="home-card-icon budget"><WalletCards /></div>
        <div><span>TRIP BUDGET</span><h2>{yuan(projectedBudget)} <small>预计总额</small></h2><p>实际记录 {yuan(actualTotal)} · {unknownCosts}项费用待确认</p></div>
        <button onClick={openBudget}>查看明细 <ArrowRight /></button>
      </article>
      <article className="home-compact-card">
        <div className="home-card-icon itinerary"><Route /></div>
        <div><span>QUICK ACCESS</span><h2>出发准备</h2><p>{activeEntityCount} 项行程安排 · 查看待办、票据与行李。</p></div>
        <button onClick={openReadiness}>查看准备 <ArrowRight /></button>
      </article>
    </section>

    <section className="home-route-section">
      <header className="home-section-heading">
        <div><span>{tripPhase === 'upcoming' ? 'UPCOMING TRIP' : tripPhase === 'traveling' ? 'YOUR JOURNEY' : tripPhase === 'past' ? 'TRIP MEMORIES' : 'YOUR TRIP'}</span><h2>A Winter Journey Through Six Cities</h2></div>
        <button onClick={openTrip}>查看行程 <ArrowRight /></button>
      </header>
      <div className="route-ribbon">
        {guideData.trip.cities.map((city) => <button key={city.id} onClick={() => openCityTrip(city.name)} aria-label={`打开${city.name}行程`}>
          <Image unoptimized src={cityCovers[city.id] ?? guideData.trip.coverImage} alt={`${city.name}代表景观`} fill sizes="(max-width: 480px) 76vw, (max-width: 1100px) 31vw, 200px" />
          <span className="route-card-shade" />
          <span className="route-card-copy"><b>{city.name}</b><small>{city.country} · {city.nights}晚</small></span>
          <i><ArrowRight /></i>
        </button>)}
      </div>
    </section>
  </div>;
}
