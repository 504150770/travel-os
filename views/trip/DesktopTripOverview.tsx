'use client';

import Image from 'next/image';
import {
  ArrowRight,
  BedDouble,
  CalendarCheck2,
  Dumbbell,
  Map,
  Route,
  ShieldAlert,
  Sparkles,
  Utensils,
} from 'lucide-react';
import type { Entity } from '@/lib/entity-library';
import type { DerivedDayState } from '@/lib/derive-current-day';
import type { PlanDay } from '@/hooks/use-editable-plan';
import type { Day } from '@/lib/types';
import { selectCoverImage } from '@/lib/media';

function EntityThumb({ entity, sizes = '96px' }: { entity?: Entity | null; sizes?: string }) {
  const cover = entity ? selectCoverImage(entity.images) : null;
  return cover ? <Image unoptimized src={cover.file} alt="" fill sizes={sizes} /> : <span>{entity?.name.slice(0, 1) ?? '·'}</span>;
}

export function DesktopTripOverview({
  day,
  hero,
  planDay,
  dayState,
  food,
  gyms,
  importantAction,
  showMap,
  inspect,
}: {
  day: Day;
  hero?: { file: string; caption: string };
  planDay: PlanDay;
  dayState: DerivedDayState;
  food: Entity[];
  gyms: Entity[];
  importantAction?: string;
  showMap: () => void;
  inspect: (entity: Entity) => void;
}) {
  const firstStop = dayState.firstStop;
  const firstItem = firstStop ? planDay.activeItems.find((item) => item.entityId === firstStop.id) : null;
  const stops = dayState.activeEntities.filter((entity) => !['activity', 'hotel'].includes(entity.type));
  const highlights = stops.filter((entity) => entity.images.length).slice(0, 3);
  const routeLabel = stops.map((entity) => entity.name).join(' → ') || dayState.routeContext;
  const foodPick = food[0];
  const gymPick = gyms[0];
  const action = dayState.route.atGlance.mustBook !== '无必须预订票'
    ? `确认预约：${dayState.route.atGlance.mustBook}`
    : (importantAction ?? dayState.route.atGlance.tomorrow);

  return <section className="workspace-overview" aria-label="Day overview" data-trip-overview>
    <div className="workspace-overview-scroll">
      <section className="workspace-overview-hero">
        {hero && <Image unoptimized src={hero.file} alt={hero.caption} fill priority sizes="(max-width: 1024px) 60vw, 980px" />}
        <div />
        <span>DAY {day.day} · {day.date.slice(5).replace('-', '/')}</span>
        <h1>{day.city}</h1>
        <h2>{day.theme}</h2>
        <p>{day.summary}</p>
      </section>

      <div className="workspace-overview-summary">
        <article>
          <CalendarCheck2 />
          <div><span>TODAY SUMMARY</span><h3>{planDay.activeItems.length} 个项目 · {day.walking}</h3><p>{day.pace}节奏 · {dayState.route.atGlance.backHotel}</p></div>
        </article>
        <article>
          <div className="workspace-overview-thumb"><EntityThumb entity={firstStop} /></div>
          <div><span>NEXT STOP</span><h3>{firstStop?.name ?? '当天无正式景点'}</h3><p>{firstItem ? `${firstItem.time} · ${firstItem.duration}` : dayState.route.atGlance.firstStop}</p></div>
          {firstStop && <button onClick={() => inspect(firstStop)} aria-label={`查看${firstStop.name}`}><ArrowRight /></button>}
        </article>
        <article>
          <Route />
          <div><span>TODAY&apos;S ROUTE</span><h3>{dayState.route.summary.walkingKm ?? '—'} km · {stops.length} stops</h3><p>{routeLabel}</p></div>
          <button onClick={showMap}>查看地图 <Map /></button>
        </article>
      </div>

      {highlights.length > 0 && <section className="workspace-overview-section">
        <header><div><Sparkles /><h2>Highlights</h2></div><span>来自 Current Plan</span></header>
        <div className="workspace-overview-highlights">
          {highlights.map((entity) => <button key={entity.id} onClick={() => inspect(entity)}>
            <span><EntityThumb entity={entity} sizes="(max-width: 1100px) 24vw, 280px" /></span>
            <b>{entity.name}</b><small>{entity.type === 'place' ? 'Place' : entity.type}</small>
          </button>)}
        </div>
      </section>}

      <div className="workspace-overview-companions">
        <article>
          <header><Utensils /><span>FOOD</span></header>
          <div className="workspace-overview-thumb"><EntityThumb entity={foodPick} /></div>
          <div><small>今日推荐</small><h3>{foodPick?.name ?? '按现有 Food 推荐现场选择'}</h3><p>{foodPick?.description || dayState.route.atGlance.meal}</p></div>
          {foodPick && <button onClick={() => inspect(foodPick)} aria-label={`查看${foodPick.name}`}><ArrowRight /></button>}
        </article>
        <article>
          <header><Dumbbell /><span>GYM</span></header>
          <div className="workspace-overview-thumb"><EntityThumb entity={gymPick} /></div>
          <div><small>{dayState.route.atGlance.gym}</small><h3>{gymPick?.name ?? '当天不安排健身房'}</h3><p>{gymPick?.description || 'Gym 保持为可选推荐。'}</p></div>
          {gymPick && <button onClick={() => inspect(gymPick)} aria-label={`查看${gymPick.name}`}><ArrowRight /></button>}
        </article>
      </div>

      <div className="workspace-overview-support">
        <article><BedDouble /><div><span>RETURN TO HOTEL</span><h3>{dayState.route.atGlance.backHotel}</h3><p>{dayState.route.legs.at(-1)?.recommended ?? '按实时导航返回酒店'}</p></div></article>
        <article><CalendarCheck2 /><div><span>IMPORTANT ACTION</span><h3>{action}</h3><p>状态继续由现有 Action Queue / Booking 数据驱动。</p></div></article>
        <article><ShieldAlert /><div><span>LATE RULE / BACKUP</span><h3>累了就删，不追进度</h3><p>{day.lossCut}</p></div></article>
      </div>
    </div>
  </section>;
}
