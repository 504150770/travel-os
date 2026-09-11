'use client';

import Image from 'next/image';
import { ExternalLink, ImageIcon, Navigation, X } from 'lucide-react';
import { useState } from 'react';
import { guideData } from '@/lib/data';
import type { Entity } from '@/lib/entity-library';
import { useEditablePlan } from '@/hooks/use-editable-plan';
import { useDialogLifecycle } from '@/hooks/use-dialog-lifecycle';
import { deriveGymFit, type DerivedDayState } from '@/lib/derive-current-day';
import { mapLinks, routeCityForDay } from '@/features/trip/tripModel';
import type { Day } from '@/lib/types';
import type { LightboxImage } from '@/features/app/appModel';
import { openGalleryRequest, selectCoverImage } from '@/lib/media';

export function GymDetailModal({
  entity,
  dayId,
  actions,
  open,
  close,
}: {
  entity: Entity;
  dayId: number;
  actions: ReturnType<typeof useEditablePlan>;
  open: (image: LightboxImage) => void;
  close: () => void;
}) {
  const dialogRef = useDialogLifecycle(close);
  const [moveTo, setMoveTo] = useState(dayId);
  const dayPlan = actions.plan.days[dayId - 1];
  const active = dayPlan.activeItems.find(
    (item) => item.entityId === entity.id,
  );
  const backup = dayPlan.alternatives.find(
    (item) => item.entityId === entity.id,
  );
  const item = active ?? backup;
  const links = mapLinks(entity);
  const raw = entity.raw;
  const cover = selectCoverImage(entity.images);
  const add = () =>
    actions.addEntity(entity.id, dayId, 'activeItems', { duration: '90min' });
  const remove = () =>
    item &&
    actions.transfer(
      dayId,
      item.id,
      active ? 'activeItems' : 'alternatives',
      'removedItems',
    );
  return (
    <div
      className="detail-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <dialog
        ref={dialogRef}
        open
        className="detail-modal gym-detail"
        aria-label={`${entity.name}详情`}
        aria-modal="true"
      >
        <button className="detail-close" onClick={close} aria-label="关闭">
          <X />
        </button>
        <button
          className="detail-hero detail-hero-button"
          onClick={() => cover && open(openGalleryRequest(entity.id, entity.name, entity.images, cover))}
          aria-label={`Open ${entity.name} gallery`}
        >
          {cover ? (
            <Image
              unoptimized
              src={cover.file}
              alt={entity.name}
              fill
              sizes="(max-width:680px) 100vw, 720px"
            />
          ) : (
            <div className="photo-pending">
              <ImageIcon />
              <span>PHOTO PENDING</span>
            </div>
          )}
          {cover && <span className="media-count">{entity.images.length} Photos</span>}
        </button>
        <div className="detail-body">
          <span>GYM DETAIL · {String(raw.tag)}</span>
          <h2>{entity.name}</h2>
          <p className="gym-rating">
            ★ {String(raw.rating)} · {entity.priceLabel}
          </p>
          <div className="detail-facts">
            <p>
              <b>Day Pass</b>
              {entity.priceLabel}
            </p>
            <p>
              <b>购买方式</b>
              {String(raw.passMethod)}
            </p>
            <p>
              <b>营业时间</b>
              {entity.openingHours}
            </p>
            <p>
              <b>从酒店</b>
              {String(raw.distance)}
            </p>
            <p>
              <b>推荐训练</b>
              {String(raw.time)}
            </p>
            <p>
              <b>器械</b>
              {String(raw.equipment)}
            </p>
            <p>
              <b>拥挤</b>
              {String(raw.crowd)}
            </p>
            <p>
              <b>灯光</b>
              {String(raw.lighting)}
            </p>
            <p>
              <b>风格</b>
              {String(raw.style)}
            </p>
            <p>
              <b>拍摄友好度</b>
              {String(raw.photo)}
            </p>
          </div>
          <p className="detail-note">
            拍摄规则以当天前台说明为准；避免拍到其他会员。
          </p>
          <div className="detail-actions">
            <a href={links.google} target="_blank" rel="noreferrer">
              Google Maps <ExternalLink />
            </a>
            {entity.hotelAnchor && (
              <a
                href={entity.hotelAnchor.directionsUrl}
                target="_blank"
                rel="noreferrer"
              >
                From Hotel <Navigation />
              </a>
            )}
            <a href={entity.source} target="_blank" rel="noreferrer">
              官网 <ExternalLink />
            </a>
            {!item && <button onClick={add}>+ 加入今天</button>}
            {backup && (
              <button
                onClick={() =>
                  actions.transfer(
                    dayId,
                    backup.id,
                    'alternatives',
                    'activeItems',
                  )
                }
              >
                加入今天
              </button>
            )}
            {item && (
              <button className="remove-action" onClick={remove}>
                移除
              </button>
            )}
          </div>
          {item && (
            <div className="gym-move">
              <b>{active ? `Added to Day ${dayId} ✓` : `Day ${dayId} 备选`}</b>
              <select
                value={moveTo}
                onChange={(event) => setMoveTo(Number(event.target.value))}
              >
                {guideData.days.map((day) => (
                  <option key={day.day} value={day.day}>
                    Day {day.day} · {routeCityForDay(day as Day)}
                  </option>
                ))}
              </select>
              <button
                disabled={moveTo === dayId}
                onClick={() => {
                  actions.moveDay(
                    dayId,
                    item.id,
                    moveTo,
                    active ? 'activeItems' : 'alternatives',
                  );
                  close();
                }}
              >
                移动
              </button>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}

export function DayGym({
  day,
  dayState,
  gyms,
  actions,
  openDetail,
}: {
  day: Day;
  dayState: DerivedDayState;
  gyms: Entity[];
  actions: ReturnType<typeof useEditablePlan>;
  openDetail: (entity: Entity) => void;
}) {
  if (!gyms.length)
    return (
      <section id="day-gym" className="section-card gym-option empty-gym">
        <span>GYM</span>
        <h2>今天不安排训练</h2>
        <p>保留恢复与慢逛时间。</p>
      </section>
    );
  const dayPlan = actions.plan.days[day.day - 1];
  const fit = deriveGymFit(day, dayState);
  return (
    <section id="day-gym" className="gym-option">
      <header>
        <span>FIT FOR TONIGHT</span>
        <h2>今天要不要练</h2>
        <p className={`gym-fit ${fit.level}`}>
          {fit.label} · {fit.reason}
        </p>
      </header>
      <div className="gym-option-grid">
        {gyms.map((entity, index) => {
          const active = dayPlan.activeItems.find(
            (item) => item.entityId === entity.id,
          );
          const backup = dayPlan.alternatives.find(
            (item) => item.entityId === entity.id,
          );
          const links = mapLinks(entity);
          return (
            <article
              className={`gym-option-card ${index === 0 ? 'top' : ''}`}
              key={entity.id}
            >
              <button
                className="gym-option-main"
                onClick={() => openDetail(entity)}
              >
                <div>
                  {entity.images[0] ? (
                    <Image
                      unoptimized
                      src={entity.images[0].file}
                      alt={entity.name}
                      fill
                      sizes="(max-width:680px) 100vw, 38vw"
                    />
                  ) : (
                    <div className="photo-pending">
                      <ImageIcon />
                      <span>PHOTO PENDING</span>
                    </div>
                  )}
                </div>
                <span>
                  {index === 0 ? 'EASY FIT TONIGHT' : 'ANOTHER OPTION'} ·{' '}
                  {String(entity.raw.tag)}
                </span>
                <h3>{entity.name}</h3>
                <p>
                  ★ {String(entity.raw.rating)} · {entity.priceLabel}
                </p>
                <small>{String(entity.raw.distance)}</small>
                <dl>
                  <div>
                    <dt>推荐时间</dt>
                    <dd>{String(entity.raw.time)}</dd>
                  </div>
                  <div>
                    <dt>力量器械</dt>
                    <dd>{String(entity.raw.equipment)}</dd>
                  </div>
                  <div>
                    <dt>拍照</dt>
                    <dd>{String(entity.raw.photo)}</dd>
                  </div>
                </dl>
              </button>
              <div className="gym-option-actions">
                <button onClick={() => openDetail(entity)}>查看详情</button>
                {entity.hotelAnchor && (
                  <a
                    href={entity.hotelAnchor.directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    From Hotel
                  </a>
                )}
                <a href={links.google} target="_blank" rel="noreferrer">
                  Google Maps
                </a>
                <a href={entity.source} target="_blank" rel="noreferrer">
                  官网
                </a>
                {!active && !backup && (
                  <button
                    onClick={() =>
                      actions.addEntity(entity.id, day.day, 'activeItems', {
                        duration: '90min',
                      })
                    }
                  >
                    + 加入今天
                  </button>
                )}
                {backup && (
                  <button
                    onClick={() =>
                      actions.transfer(
                        day.day,
                        backup.id,
                        'alternatives',
                        'activeItems',
                      )
                    }
                  >
                    加入今天
                  </button>
                )}
                {active && <span>已加入 Day {day.day} ✓</span>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
