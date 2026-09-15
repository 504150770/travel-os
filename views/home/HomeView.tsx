'use client';

import Image from 'next/image';
import { ArrowRight, CalendarDays, CheckSquare2, MapPinned, Route, WalletCards } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { guideData } from '@/lib/data';
import type { ActionItem } from '@/lib/action-queue';
import { yuan } from '@/features/app/appModel';

const HOME_HERO = '/images/places/eiffel/01.webp';
const cityCovers: Record<string, string> = {
  rome: '/images/p7_0.webp',
  florence: '/images/p16_0.webp',
  venice: '/images/places/grand_canal/03.webp',
  vienna: '/images/p42_1.webp',
  prague: '/images/places/charles_bridge/03.webp',
  paris: HOME_HERO,
};

function useHomePerformanceMarks() {
  const homeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = homeRef.current;
    if (!node) return;
    node.dataset.homeMountedAt = String(Math.round(performance.now()));
    if (!('PerformanceObserver' in window)) return;
    const observer = new PerformanceObserver((list) => {
      const entry = list.getEntries().at(-1);
      if (entry) node.dataset.homeLcpMs = String(Math.round(entry.startTime));
    });
    try { observer.observe({ type: 'largest-contentful-paint', buffered: true }); }
    catch { return; }
    return () => observer.disconnect();
  }, []);
  return homeRef;
}

export function HomeView({ daysLeft, nextAction, projectedBudget, actualTotal, unknownCosts, activeEntityCount, openTrip, openNextAction, openBudget }: {
  daysLeft: number | null; nextAction?: ActionItem; projectedBudget: number; actualTotal: number;
  unknownCosts: number; activeEntityCount: number; openTrip: () => void; openNextAction: () => void; openBudget: () => void;
}) {
  const homeRef = useHomePerformanceMarks();
  return <div ref={homeRef} className="v2-view home-v2" data-home-view>
    <section className="home-cover" data-home-hero>
      <Image
        unoptimized
        src={HOME_HERO}
        alt="日出时的巴黎埃菲尔铁塔"
        fill
        priority
        fetchPriority="high"
        sizes="(max-width: 767px) 100vw, (max-width: 1360px) calc(100vw - 48px), 1280px"
        onLoad={() => { if (homeRef.current) homeRef.current.dataset.homeHeroLoadedMs = String(Math.round(performance.now())); }}
      />
      <div className="cover-shade" />
      <div className="cover-copy">
        <span>EUROPE 2026</span>
        <h1>六座城市，<br />一段冬日旅程。</h1>
        <p className="home-route-line">罗马 · 佛罗伦萨 · 威尼斯 · 维也纳 · 布拉格 · 巴黎</p>
        <p className="home-trip-facts">18 Days · 6 Cities</p>
        <button onClick={openTrip}>继续我的行程 <ArrowRight /></button>
      </div>
      <div className="countdown"><CalendarDays /><b>{daysLeft ?? '—'}</b><span>{daysLeft === null ? '行程倒计时' : '天后出发'}</span></div>
    </section>

    <section className="home-route-section">
      <header className="home-section-heading">
        <div><span>UPCOMING TRIP</span><h2>六座城市，一条冬日路线</h2></div>
        <button onClick={openTrip}>查看完整行程 <ArrowRight /></button>
      </header>
      <div className="route-ribbon">
        {guideData.trip.cities.map((city) => <button key={city.id} onClick={openTrip} aria-label={`打开${city.name}行程`}>
          <Image unoptimized src={cityCovers[city.id] ?? guideData.trip.coverImage} alt={`${city.name}代表景观`} fill sizes="(max-width: 480px) 76vw, (max-width: 1100px) 31vw, 200px" />
          <span className="route-card-shade" />
          <span className="route-card-copy"><b>{city.name}</b><small>{city.country} · {city.nights}晚</small></span>
          <i><ArrowRight /></i>
        </button>)}
      </div>
    </section>

    <section className="home-dashboard">
      <article className="home-next-action">
        <div className="home-card-icon"><CheckSquare2 /></div>
        <div className="home-action-copy">
          <span>NEXT ACTION · {nextAction?.due ?? 'READY'}</span>
          <h2>{nextAction?.title ?? '当前任务已完成'}</h2>
          <p>{nextAction?.detail ?? '现有 Action Queue 暂无待处理事项。'}</p>
          <button onClick={openNextAction}>查看详情 <ArrowRight /></button>
        </div>
        <div className="home-paper-art" aria-hidden="true"><MapPinned /><span /><span /><span /></div>
      </article>
      <article className="home-compact-card">
        <div className="home-card-icon budget"><WalletCards /></div>
        <div><span>TRIP BUDGET</span><h2>{yuan(projectedBudget)} <small>/ {yuan(actualTotal)}</small></h2><p>{unknownCosts}项费用待确认；Current Plan 变更会自动重算</p></div>
        <button onClick={openBudget}>查看明细 <ArrowRight /></button>
      </article>
      <article className="home-compact-card">
        <div className="home-card-icon itinerary"><Route /></div>
        <div><span>QUICK ACCESS</span><h2>{activeEntityCount} 个正式项目</h2><p>支持加入、备选、换天、排序、自定义与撤销。</p></div>
        <button onClick={openTrip}>打开行程 <ArrowRight /></button>
      </article>
    </section>
  </div>;
}
