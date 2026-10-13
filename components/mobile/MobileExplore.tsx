'use client';

import Image from 'next/image';
import { CalendarDays, Camera, Check, Heart, Navigation, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Entity, EntityType } from '@/lib/entity-library';
import { normalizeRouteCity } from '@/lib/entity-library';
import type { AppController } from '@/features/app/useAppController';
import type { DiscoverTab } from '@/features/app/appModel';
import { cityNames } from '@/features/app/appModel';
import { selectCoverImage } from '@/lib/media';
import { MobileEntitySheet } from '@/components/mobile/MobileEntitySheet';
import { MobilePlanTarget } from '@/components/mobile/MobilePlanTarget';

const categories: Array<[DiscoverTab, string, EntityType[]]> = [
  ['places', '地点与活动', ['place', 'activity', 'photo_spot', 'custom']],
  ['food', '美食', ['restaurant', 'cafe']],
  ['gym', '健身', ['gym']],
  ['shopping', '购物', ['shopping']],
];

export function MobileExplore({ controller }: { controller: AppController }) {
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Entity | null>(null);
  const activeCategory =
    categories.find(([id]) => id === controller.discoverTab) ?? categories[0];
  const shown = useMemo(
    () =>
      controller.entities
        .filter(
          (entity) =>
            normalizeRouteCity(entity.city) === controller.discoverCity &&
            activeCategory[2].includes(entity.type) &&
            `${entity.name} ${entity.description} ${entity.tags.join(' ')}`
              .toLowerCase()
              .includes(search.trim().toLowerCase()),
        )
        .sort(
          (a, b) =>
            Number(a.raw.hotelPriority ?? 99) - Number(b.raw.hotelPriority ?? 99),
        ),
    [activeCategory, controller.discoverCity, controller.entities, search],
  );
  return (
    <main className="mobile-explore" data-mobile-screen="explore">
      <header className="mobile-screen-heading">
        <span>EXPLORE</span>
        <h1>沿着行程发现</h1>
        <p>收藏心动的地点，选择旅行日后加入行程。</p>
      </header>
      <div className="mobile-search">
        <Search />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`搜索${controller.discoverCity} · ${activeCategory[1]}`}
          aria-label={`搜索${controller.discoverCity}的${activeCategory[1]}`}
        />
        {search && <button className="mobile-search-clear" onClick={() => setSearch('')} aria-label="清除搜索关键词"><X /></button>}
      </div>
      <div className="mobile-filter-row">
        {categories.map(([id, label]) => (
          <button
            key={id}
            className={activeCategory[0] === id ? 'active' : ''}
            onClick={() => controller.selectMobileDiscoverTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <select
        className="mobile-city-select"
        aria-label="选择城市"
        value={controller.discoverCity}
        onChange={(event) => controller.selectMobileDiscoverCity(event.target.value)}
      >
        {cityNames.map((city) => (
          <option key={city}>{city}</option>
        ))}
      </select>
      <MobilePlanTarget selectedDay={controller.selectedDay} selectDay={controller.selectMobileDay} />
      <div className="mobile-explore-grid">
        {shown.length === 0 && (
          <output className="mobile-explore-empty">
            <Search aria-hidden="true" />
            <span className="mobile-explore-empty-title">{search.trim() ? '没有找到匹配的推荐' : '暂无此类推荐'}</span>
            <span className="mobile-explore-empty-description">{search.trim() ? '试试其他关键词，或切换城市与分类。' : '可以切换城市或分类继续查看。'}</span>
          </output>
        )}
        {shown.map((entity) => {
          const cover = selectCoverImage(entity.images);
          const favorite = Boolean(controller.favorites[entity.id]);
          const placed = controller.actions.placement(entity.id, controller.selectedDay);
          return (
            <article key={entity.id}>
              <button className="mobile-explore-image" onClick={() => setDetail(entity)} aria-label={`查看 ${entity.name}`}>
                {cover ? (
                  <Image
                    unoptimized
                    src={cover.file}
                    alt={cover.title || entity.name}
                    fill
                    loading="lazy"
                    sizes="(max-width:430px) 50vw, 210px"
                  />
                ) : (
                  <span className="mobile-explore-placeholder" aria-hidden="true">
                    {entity.raw.type === 'transport' ? <Navigation /> : entity.type === 'activity' ? <CalendarDays /> : <Camera />}
                    <span>{entity.raw.type === 'transport' ? '交通安排' : entity.type === 'activity' ? '行程活动' : '暂无图片'}</span>
                  </span>
                )}
              </button>
              <button
                className={`mobile-favorite ${favorite ? 'active' : ''}`}
                onClick={() =>
                  controller.setFavorites({
                    ...controller.favorites,
                    [entity.id]: !favorite,
                  })
                }
                aria-label={favorite ? `取消收藏 ${entity.name}` : `收藏 ${entity.name}`}
              >
                <Heart fill={favorite ? 'currentColor' : 'none'} />
              </button>
              <button className="mobile-explore-copy" onClick={() => setDetail(entity)}>
                <h2>{entity.name}</h2>
                <p>{entity.priceLabel}</p>
              </button>
              {placed?.zone === 'backup' && <span className="mobile-placement-note">Day {placed.dayId} 备选</span>}
              <button
                className="mobile-add-today"
                disabled={placed?.zone === 'trip'}
                onClick={() => {
                  if (placed?.zone === 'backup') {
                    controller.actions.transfer(placed.dayId, placed.itemId, 'alternatives', 'activeItems');
                  } else if (!placed) {
                    controller.actions.addEntity(entity.id, controller.selectedDay, 'activeItems');
                  }
                }}
              >
                {placed?.zone === 'trip' ? <Check /> : <Plus />}
                {placed?.zone === 'trip' ? `Day ${placed.dayId} 已加入` : `加入 Day ${controller.selectedDay}`}
              </button>
            </article>
          );
        })}
      </div>
      <MobileEntitySheet entity={detail} close={() => setDetail(null)} controller={controller} />
    </main>
  );
}
