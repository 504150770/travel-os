'use client';

import Image from 'next/image';
import { Heart, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Entity, EntityType } from '@/lib/entity-library';
import { normalizeRouteCity } from '@/lib/entity-library';
import type { AppController } from '@/features/app/useAppController';
import type { DiscoverTab } from '@/features/app/appModel';
import { cityNames } from '@/features/app/appModel';
import { selectCoverImage } from '@/lib/media';
import { MobileEntitySheet } from '@/components/mobile/MobileEntitySheet';

const categories: Array<[DiscoverTab, string, EntityType[]]> = [
  ['places', 'Places', ['place', 'activity', 'photo_spot', 'custom']],
  ['food', 'Food', ['restaurant', 'cafe']],
  ['gym', 'Gym', ['gym']],
  ['shopping', 'Shopping', ['shopping']],
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
        <p>浏览不会修改 Current Plan；只有明确点击 Add to Today 才会加入。</p>
      </header>
      <label className="mobile-search">
        <Search />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search places, food, gym…"
        />
      </label>
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
      <div className="mobile-explore-grid">
        {shown.map((entity) => {
          const cover = selectCoverImage(entity.images);
          const favorite = Boolean(controller.favorites[entity.id]);
          const placed = controller.actions.placement(entity.id, controller.selectedDay);
          return (
            <article key={entity.id}>
              <button className="mobile-explore-image" onClick={() => setDetail(entity)}>
                {cover && (
                  <Image
                    unoptimized
                    src={cover.file}
                    alt={cover.title || entity.name}
                    fill
                    loading="lazy"
                    sizes="(max-width:430px) 50vw, 210px"
                  />
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
                <span>{entity.type}</span>
                <h2>{entity.name}</h2>
                <p>{entity.priceLabel}</p>
              </button>
              <button
                className="mobile-add-today"
                disabled={Boolean(placed)}
                onClick={() =>
                  controller.actions.addEntity(
                    entity.id,
                    controller.selectedDay,
                    'activeItems',
                  )
                }
              >
                <Plus /> {placed ? `Day ${placed.dayId} 已加入` : 'Add to Today'}
              </button>
            </article>
          );
        })}
      </div>
      <MobileEntitySheet entity={detail} close={() => setDetail(null)} controller={controller} />
    </main>
  );
}
