'use client';

import Image from 'next/image';
import { Heart, ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { guideData } from '@/lib/data';
import type { Entity, EntityImage } from '@/lib/entity-library';
import { openGalleryRequest, selectCoverImage } from '@/lib/media';
import type { LightboxImage } from '@/features/app/appModel';
import { mapLinks, routeCityForDay } from '@/features/trip/tripModel';
import type { Day } from '@/lib/types';

export function Media({
  images,
  entityId,
  name,
  open,
  hero = false,
}: {
  images: EntityImage[];
  entityId: string;
  name: string;
  open: (image: LightboxImage) => void;
  hero?: boolean;
}) {
  if (!images.length)
    return (
      <div className={`entity-media pending ${hero ? 'hero' : ''}`}>
        <ImageIcon />
        <span>PHOTO PENDING</span>
      </div>
    );
  const cover = selectCoverImage(images);
  return (
    <div className={`entity-media cover-only ${hero ? 'hero' : ''}`}>
      <button
        onClick={() => open(openGalleryRequest(entityId, name, images, cover))}
        aria-label={`Open ${name} gallery, ${images.length} photos`}
      >
        {cover.file.startsWith('/') ? (
          <Image
            unoptimized
            src={cover.file}
            alt={cover.title || cover.caption || name}
            fill
            sizes={hero ? '100vw' : '(max-width:680px) 88vw, 420px'}
          />
        ) : (
          <span
            className="remote-image"
            title={cover.title || cover.caption || name}
            style={{ backgroundImage: `url(${cover.file})` }}
          />
        )}
        <span className="media-count">{images.length} Photos</span>
      </button>
    </div>
  );
}

export function Favorite({
  id,
  value,
  setValue,
}: {
  id: string;
  value: Record<string, boolean>;
  setValue: (v: Record<string, boolean>) => void;
}) {
  const active = Boolean(value[id]);
  return (
    <button
      className={`favorite ${active ? 'active' : ''}`}
      onClick={() => setValue({ ...value, [id]: !active })}
      aria-label={active ? '取消收藏' : '收藏'}
    >
      <Heart size={17} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}

export function EntityActions({
  entity,
  selectedDay,
  addEntity,
  placement,
}: {
  entity: Entity;
  selectedDay: number;
  addEntity: (
    id: string,
    day: number,
    target: 'activeItems' | 'alternatives',
  ) => void;
  placement: (
    id: string,
    preferredDayId?: number,
  ) => { dayId: number; zone: 'trip' | 'backup' } | null;
}) {
  const [day, setDay] = useState(selectedDay);
  const [added, setAdded] = useState(false);
  const placed = placement(entity.id, day);
  const links = mapLinks(entity);
  const add = (target: 'activeItems' | 'alternatives') => {
    addEntity(entity.id, day, target);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1300);
  };
  return (
    <div className="entity-actions">
      <select
        aria-label={`${entity.name}选择日期`}
        value={day}
        onChange={(event) => setDay(Number(event.target.value))}
      >
        {guideData.days.map((item) => (
          <option key={item.day} value={item.day}>
            D{item.day} · {routeCityForDay(item as Day)}
          </option>
        ))}
      </select>
      {placed ? (
        <>
          <span className="added-chip">
            {placed.zone === 'trip'
              ? `已加入 Day ${placed.dayId} ✓`
              : `Day ${placed.dayId} 备选`}
          </span>
          {placed.zone === 'backup' && (
            <button
              onClick={() => addEntity(entity.id, placed.dayId, 'activeItems')}
            >
              加入今天
            </button>
          )}
        </>
      ) : (
        <>
          <button onClick={() => add('activeItems')}>
            {added ? 'Added ✓' : '+ 加入今天'}
          </button>
          <button onClick={() => add('alternatives')}>加入备选</button>
        </>
      )}
      <a href={links.google} target="_blank" rel="noreferrer">
        导航
      </a>
      {entity.hotelAnchor && (
        <a
          className="from-hotel-link"
          href={entity.hotelAnchor.directionsUrl}
          target="_blank"
          rel="noreferrer"
        >
          从酒店出发
        </a>
      )}
      <details>
        <summary>•••</summary>
        <div>
          <a href={links.apple} target="_blank" rel="noreferrer">
            Apple Maps
          </a>
          <a href={links.xhs} target="_blank" rel="noreferrer">
            小红书攻略
          </a>
          {entity.source.startsWith('http') && (
            <a href={entity.source} target="_blank" rel="noreferrer">
              来源
            </a>
          )}
        </div>
      </details>
    </div>
  );
}
