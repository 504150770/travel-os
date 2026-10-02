'use client';

import Image from 'next/image';
import {
  ArrowRight,
  BedDouble,
  Camera,
  Dumbbell,
  Info,
  Navigation,
  Utensils,
} from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import type { ActionItem } from '@/lib/action-queue';
import type { Entity } from '@/lib/entity-library';
import type { DerivedDayState } from '@/lib/derive-current-day';
import type { Day, HotelBooking } from '@/lib/types';
import type { GalleryRequest } from '@/lib/media';
import {
  normalizeGalleryImage,
  openGalleryRequest,
  selectCoverImage,
} from '@/lib/media';
import { mapLinks } from '@/features/trip/tripModel';
import type { PlanPresentationRow, TodaysTip } from '@/features/trip/tripPresentationModel';
import { placeOverviewCopy } from '@/features/trip/overviewCopy';
import { isSightseeingEntity } from '@/features/trip/planStatusModel';
import { TodaysTipsCard } from '@/views/trip/TodaysTipsCard';

function usefulCopy(entity: Entity | undefined, fallback: string) {
  if (!entity) return fallback;
  return entity.description || entity.notes || fallback;
}

function RecommendationCard({
  kind,
  entity,
  fallback,
  inspect,
  openGallery,
}: {
  kind: 'food' | 'gym';
  entity?: Entity;
  fallback: string;
  inspect: (entity: Entity) => void;
  openGallery: (gallery: GalleryRequest) => void;
}) {
  const cover = entity ? selectCoverImage(entity.images) : null;
  const isFood = kind === 'food';
  return <article className="workspace-practical-card">
    <header>{isFood ? <Utensils /> : <Dumbbell />}<b>{isFood ? '美食推荐' : '健身推荐'}</b><span>可选</span></header>
    {entity && cover ? <button
      className="workspace-practical-image"
      onClick={() => openGallery(openGalleryRequest(entity.id, entity.name, entity.images, cover))}
      aria-label={`查看 ${entity.name} 图片`}
    ><Image unoptimized src={cover.file} alt={cover.title || entity.name} fill sizes="150px" /></button> : <div className="workspace-practical-image placeholder">{isFood ? <Utensils /> : <Dumbbell />}</div>}
    <div className="workspace-practical-copy">
      <h3>{entity?.name ?? (isFood ? '按现有推荐现场选择' : '当天不安排健身房')}</h3>
      <p>{usefulCopy(entity, fallback)}</p>
      {entity && <div className="workspace-inline-actions">
        <button onClick={() => inspect(entity)}>查看详情 <ArrowRight /></button>
        <a href={mapLinks(entity).google} target="_blank" rel="noreferrer"><Navigation /> 导航</a>
      </div>}
    </div>
  </article>;
}

export function DesktopTripOverview({
  day,
  hero,
  dayState,
  rows,
  food,
  gyms,
  stay,
  dayAction,
  tips,
  inspect,
  openGallery,
  openHotel,
}: {
  day: Day;
  hero?: { file: string; caption: string };
  dayState: DerivedDayState;
  rows: PlanPresentationRow[];
  food: Entity[];
  gyms: Entity[];
  stay?: HotelBooking;
  dayAction?: ActionItem;
  tips: TodaysTip[];
  inspect: (entity: Entity) => void;
  openGallery: (gallery: GalleryRequest) => void;
  openHotel: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const places = dayState.activeEntities.filter(isSightseeingEntity);
  // Reuse the user's existing panorama for the wide context banner, rather
  // than cropping the same portrait landmark used again in the sight cards.
  const overviewHero = places.some((entity) => entity.id === 'eiffel')
    ? { file: '/images/home-eiffel-winter-sunset.png', caption: '冬日落日下的巴黎埃菲尔铁塔与塞纳河' }
    : hero;
  const walkingKm = dayState.route.summary.walkingKm;
  const hotelImages = useMemo(() => (stay?.images ?? [])
    .filter((image) => Boolean(image.file))
    .map((image) => normalizeGalleryImage({ ...image, file: image.file! }, {
      entityId: stay?.id ?? 'stay',
      title: stay?.hotelName ?? 'Hotel',
    })), [stay]);
  const hotelCover = selectCoverImage(hotelImages);
  const hotelMaps = stay
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stay.execution.address)}`
    : null;
  const lastLeg = dayState.route.legs.at(-1);
  const returnPending = !lastLeg || lastLeg.status.toLowerCase().includes('pending') || lastLeg.recommended.includes('待确认');

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [day.day]);

  return <section className="workspace-overview" aria-label="Day overview" data-trip-overview>
    <div className="workspace-overview-scroll" ref={scrollRef}>
      <section className={`workspace-overview-hero${places.some((entity) => entity.id === 'eiffel') ? ' is-panorama' : ''}`}>
        {overviewHero && <Image unoptimized src={overviewHero.file} alt={overviewHero.caption} fill priority sizes="(max-width: 1024px) 62vw, 1040px" />}
        <div />
        <span>{day.city.toUpperCase()}</span>
        <h1>{day.theme}</h1>
        <p>{day.summary}</p>
      </section>

      <section className="workspace-place-section" aria-labelledby="workspace-places-heading">
        <header><div><span className="workspace-section-icon"><Camera /></span><h2 id="workspace-places-heading">今天的景点</h2></div><p>{places.length} 个景点{walkingKm == null ? '' : ` · 已知步行路段 ${walkingKm} km`}</p></header>
        {places.length > 0 ? <div className={`workspace-place-grid count-${Math.min(places.length, 4)}`}>
          {places.map((entity) => {
            const cover = selectCoverImage(entity.images);
            const description = placeOverviewCopy(entity, rows.find((row) => row.entity.id === entity.id)?.item.notes);
            return <article className="workspace-place-card" key={entity.id}>
              {cover ? <button className="workspace-place-image" onClick={() => openGallery(openGalleryRequest(entity.id, entity.name, entity.images, cover))} aria-label={`打开 ${entity.name} 图库`}>
                <Image unoptimized src={cover.file} alt={cover.title || entity.name} fill sizes="(max-width: 1180px) 50vw, 520px" />
                <span><Camera /> {entity.images.length} 张图片</span>
              </button> : <button className="workspace-place-image placeholder" onClick={() => inspect(entity)} aria-label={`查看 ${entity.name} 详情`}><Camera /><span>查看详情</span></button>}
              <div><div className="workspace-place-title"><h3>{entity.name}</h3></div><p>{description}</p><button onClick={() => inspect(entity)} aria-label={`查看 ${entity.name} 详情`}><ArrowRight /></button></div>
            </article>;
          })}
        </div> : <p className="workspace-place-empty">当天没有正式景点，完整安排请看左侧时间线。</p>}
      </section>

      <div className="workspace-practical-grid">
        <RecommendationCard kind="food" entity={food[0]} fallback={dayState.route.atGlance.meal} inspect={inspect} openGallery={openGallery} />
        <RecommendationCard kind="gym" entity={gyms[0]} fallback="Gym 保持为可选推荐。" inspect={inspect} openGallery={openGallery} />
        {stay && <article className="workspace-practical-card workspace-hotel-card">
          <header><BedDouble /><b>返回酒店</b><span>{returnPending ? '时间待确认' : '今日住宿'}</span></header>
          {hotelCover ? <button className="workspace-practical-image" onClick={() => openGallery(openGalleryRequest(stay.id, stay.hotelName, hotelImages, hotelCover))} aria-label={`打开 ${stay.hotelName} 图片`}><Image unoptimized src={hotelCover.file} alt={hotelCover.title || stay.hotelName} fill sizes="150px" /></button> : <div className="workspace-practical-image placeholder"><BedDouble /></div>}
          <div className="workspace-practical-copy"><h3>{stay.hotelName}</h3><p>{stay.areaLabel ?? stay.city} · {stay.execution.address}</p><small>{returnPending ? '返程时间待确认' : lastLeg.recommended}</small><div className="workspace-inline-actions">{hotelMaps && <a className="primary" href={hotelMaps} target="_blank" rel="noreferrer"><Navigation /> 导航</a>}<button onClick={openHotel}>查看住宿 <ArrowRight /></button></div></div>
        </article>}
      </div>

      {dayAction && <section className="workspace-day-action"><Info /><div><span>当天提醒</span><h2>{dayAction.title}</h2><p>{dayAction.detail}</p></div></section>}

      <TodaysTipsCard tips={tips} />
      <footer className="workspace-overview-end" aria-hidden="true" />
    </div>
  </section>;
}
