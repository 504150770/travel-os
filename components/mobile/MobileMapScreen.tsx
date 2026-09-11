'use client';

import Image from 'next/image';
import { Component, lazy, Suspense, type ReactNode } from 'react';
import { ChevronRight, LocateFixed, Navigation } from 'lucide-react';
import type { Entity } from '@/lib/entity-library';
import type { DayRoute } from '@/lib/types';
import type { MobileMapPoint } from '@/features/mobile/mobileModel';
import { mapLinks } from '@/features/trip/tripModel';

const MobileMapCanvas = lazy(() => import('@/components/mobile/map/MobileMapCanvas'));

class MapBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="mobile-map-empty">
          <b>Map temporarily unavailable</b>
          <p>路线与 Current Plan 仍可正常使用，请通过 Navigate 打开 Google Maps。</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function MobileMapScreen({
  route,
  points,
  food,
  gym,
  selected,
  select,
  openEntity,
  resolve,
}: {
  route: DayRoute;
  points: MobileMapPoint[];
  food: Entity[];
  gym?: Entity;
  selected: MobileMapPoint | null;
  select: (point: MobileMapPoint | null) => void;
  openEntity: (entity: Entity) => void;
  resolve: (id: string) => Entity | undefined;
}) {
  const selectedEntity = selected?.entityId ? resolve(selected.entityId) : undefined;
  return (
    <main className="mobile-map-screen" data-mobile-screen="map">
      <div className="mobile-map-summary">
        <span>DAY {route.day} ROUTE</span>
        <b>{route.summary.transfers} legs · {route.summary.walkingKm ?? '—'} km</b>
      </div>
      <MapBoundary>
        <Suspense
          fallback={
            <div className="mobile-map-loading">
              <LocateFixed />
              <span>Loading today’s map…</span>
            </div>
          }
        >
          <MobileMapCanvas points={points} route={route} onSelect={select} />
        </Suspense>
      </MapBoundary>

      {selected && (
        <article className="mobile-map-preview">
          {selected.image && (
            <Image
              unoptimized
              src={selected.image}
              alt={selected.name}
              width={72}
              height={72}
            />
          )}
          <div>
            <span>{selected.kind.toUpperCase()}</span>
            <h2>{selected.name}</h2>
            <p>{selected.detail}</p>
          </div>
          <div>
            {selectedEntity && (
              <button onClick={() => openEntity(selectedEntity)}>Details</button>
            )}
            <a
              href={
                selectedEntity
                  ? mapLinks(selectedEntity).google
                  : `https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`
              }
              target="_blank"
              rel="noreferrer"
            >
              <Navigation /> Navigate
            </a>
          </div>
          <button className="mobile-map-preview-close" onClick={() => select(null)} aria-label="关闭地图预览">×</button>
        </article>
      )}

      {(food.length > 0 || gym) && (
        <section className="mobile-map-companions">
          <span>ALONG TODAY</span>
          {food[0] && (
            <button onClick={() => openEntity(food[0])}>
              <b>{food[0].name}</b>
              <small>Food · Best for today</small>
              <ChevronRight />
            </button>
          )}
          {gym && (
            <button onClick={() => openEntity(gym)}>
              <b>{gym.name}</b>
              <small>Gym · Possible tonight</small>
              <ChevronRight />
            </button>
          )}
        </section>
      )}
    </main>
  );
}
