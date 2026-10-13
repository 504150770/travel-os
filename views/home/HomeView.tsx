'use client';

import Image from 'next/image';
import { ArrowRight, CalendarDays, CheckSquare2, Route, WalletCards } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { guideData } from '@/lib/data';
import type { ActionItem } from '@/lib/action-queue';
import { yuan } from '@/features/app/appModel';
import { routeCityForDay } from '@/features/trip/tripModel';
import type { Day } from '@/lib/types';
import './home-workbench.css';

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
  const tripDate = (date: string) => date.replaceAll('-', '/');
  const dayDate = day ? `${Number(day.date.slice(5, 7))}月${Number(day.date.slice(8, 10))}日` : '';
  const actionLabel = nextAction?.target === 'checkin' ? '查看入住' : nextAction?.target === 'deadlines' ? '查看关键日期' : '查看待办';
  return <div ref={homeRef} className="v2-view home-v2 home-workbench" data-home-view data-trip-phase={tripPhase}>
    <header className="hw-heading">
      <div className="hw-title">
        <p className="hw-eyebrow">我的旅行</p>
        <h1>欧洲冬日旅程</h1>
        <p className="hw-trip-facts">
          <span><time dateTime={guideData.trip.startDate}>{tripDate(guideData.trip.startDate)}</time><span aria-hidden="true"> — </span><time dateTime={guideData.trip.endDate}>{tripDate(guideData.trip.endDate)}</time></span>
          <span>{guideData.days.length}天 · {guideData.trip.cities.length}城</span>
        </p>
      </div>
      <p className="hw-status"><CalendarDays aria-hidden="true" />{tripPhase === 'upcoming' ? <>距出发 <strong>{daysLeft}</strong> 天</> : tripPhase === 'traveling' ? '旅程进行中' : tripPhase === 'past' ? '旅程回顾' : '旅行概览'}</p>
    </header>

    <section className="hw-hero" aria-label="所选日期行程入口" data-home-hero>
      <picture className="hw-hero-media">
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
      <div className="hw-hero-shade" aria-hidden="true" />
      <div className="hw-day-entry">
        <p className="hw-hero-eyebrow">{day ? '当前查看' : '旅行行程'}</p>
        {day && <p className="hw-day-context"><span>Day {day.day}</span><time dateTime={day.date}>{dayDate}</time><span>{routeCityForDay(day)}</span></p>}
        <h2>{day?.theme ?? guideData.trip.subtitle}</h2>
        <button type="button" onClick={openTrip} aria-label={day ? `查看 Day ${day.day} · ${dayDate} · ${routeCityForDay(day)}行程` : '查看完整行程'}>{day ? '打开这一天行程' : '查看完整行程'} <ArrowRight aria-hidden="true" /></button>
      </div>
      <span className="hw-cover-caption">巴黎 · 冬日风景</span>
    </section>

    <section className="hw-dashboard" aria-label="旅行待办与准备">
      <article className="hw-next-action">
        <div className="hw-card-heading"><span><CheckSquare2 aria-hidden="true" />{nextAction ? '下一待办' : '出发检查'}</span>{nextAction && <span className="hw-action-due">{nextAction.due}</span>}</div>
        <div className="hw-action-copy">
          <h2>{nextAction?.title ?? '当前暂无待办'}</h2>
          <p>{nextAction?.detail ?? '查看出发准备，确认票据、资料与行李。'}</p>
        </div>
        <button type="button" className="hw-card-link" onClick={nextAction ? openNextAction : openReadiness}>{nextAction ? actionLabel : '查看出发准备'} <ArrowRight aria-hidden="true" /></button>
      </article>
      <article className="hw-summary-card hw-budget-card">
        <div className="hw-card-heading"><span><WalletCards aria-hidden="true" />旅行预算</span></div>
        <h2>{yuan(projectedBudget)} <small>预计总额</small></h2>
        <p>实际记录 {yuan(actualTotal)}</p>
        <p className="hw-card-note">{unknownCosts}项费用待确认</p>
        <button type="button" className="hw-card-link" onClick={openBudget}>查看明细 <ArrowRight aria-hidden="true" /></button>
      </article>
      <article className="hw-summary-card hw-readiness-card">
        <div className="hw-card-heading"><span><Route aria-hidden="true" />出发准备</span></div>
        <h2>{activeEntityCount} <small>项行程安排</small></h2>
        <p>待办、票据与行李</p>
        <p className="hw-card-note">集中查看旅行准备</p>
        <button type="button" className="hw-card-link" onClick={openReadiness}>查看准备 <ArrowRight aria-hidden="true" /></button>
      </article>
    </section>

    <section className="hw-route-section" aria-labelledby="home-route-title">
      <header className="hw-section-heading">
        <div><h2 id="home-route-title">六城路线</h2><p>{guideData.trip.cities.map((city) => city.name).join(' → ')}</p></div>
        <button type="button" className="hw-card-link" onClick={openTrip}>全部行程 <ArrowRight aria-hidden="true" /></button>
      </header>
      <ol className="hw-city-route">
        {guideData.trip.cities.map((city, index) => <li key={city.id}><button type="button" onClick={() => openCityTrip(city.name)} aria-label={`打开${city.name}行程`}>
          <span className="hw-city-image">
            <Image unoptimized src={cityCovers[city.id] ?? guideData.trip.coverImage} alt={`${city.name}代表景观`} fill sizes="(max-width: 599px) 46vw, (max-width: 1100px) 30vw, 200px" />
            <span className="hw-city-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          </span>
          <span className="hw-city-copy"><b>{city.name}</b><small>{city.country} · {city.nights}晚</small></span>
          <ArrowRight className="hw-city-arrow" aria-hidden="true" />
        </button></li>)}
      </ol>
    </section>
  </div>;
}
