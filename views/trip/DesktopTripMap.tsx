'use client';

import Image from 'next/image';
import { Component, lazy, Suspense, type ReactNode } from 'react';
import { Crosshair, ExternalLink, Navigation, Plus } from 'lucide-react';
import type { Entity } from '@/lib/entity-library';
import type { DayRoute } from '@/lib/types';
import type { MapPoint } from '@/features/map/mapModel';
import { mapLinks } from '@/features/trip/tripModel';

const MapCanvas = lazy(() => import('@/components/map/MapCanvas'));

class DesktopMapBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="workspace-map-empty"><b>Map temporarily unavailable</b><p>Timeline and Google Maps navigation remain available.</p></div>;
    return this.props.children;
  }
}

export function DesktopTripMap({
  points,
  route,
  selectedPointId,
  selectedLegId,
  showRoute,
  fitToken,
  selectPoint,
  resolve,
  openDetails,
  addCandidate,
}: {
  points: MapPoint[];
  route: DayRoute;
  selectedPointId: string | null;
  selectedLegId: string | null;
  showRoute: boolean;
  fitToken: string;
  selectPoint: (id: string) => void;
  resolve: (id: string) => Entity | undefined;
  openDetails: (entity: Entity | null, hotel: boolean) => void;
  addCandidate: (entity: Entity) => void;
}) {
  const selected = points.find((point) => point.id === selectedPointId) ?? null;
  const entity = selected?.entityId ? resolve(selected.entityId) : undefined;
  const navigate = entity
    ? mapLinks(entity).google
    : selected
      ? `https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`
      : '#';
  return (
    <section className="workspace-map" aria-label="Interactive trip map">
      <DesktopMapBoundary>
        <Suspense fallback={<div className="workspace-map-loading"><Crosshair /><span>Preparing trip map…</span></div>}>
          <MapCanvas
            points={points}
            route={route}
            selectedPointId={selectedPointId}
            selectedLegId={selectedLegId}
            showRoute={showRoute}
            fitToken={fitToken}
            className="desktop-map-canvas"
            onSelect={(point) => selectPoint(point.id)}
          />
        </Suspense>
      </DesktopMapBoundary>
      <div className="workspace-map-disclaimer">Schematic point order · use Navigate for live directions</div>
      {selected && (
        <article className="workspace-map-preview">
          {selected.image && <Image unoptimized src={selected.image} alt="" width={88} height={76} />}
          <div>
            <span>{selected.kind === 'hotel' ? 'HOTEL' : selected.kind.toUpperCase()}</span>
            <h2>{selected.name}</h2>
            <p>{selected.time ? `${selected.time} · ${selected.duration}` : selected.detail}</p>
            {selected.ticket && <small>{selected.ticket}</small>}
          </div>
          <div>
            {selected.kind === 'candidate' && entity ? (
              <button onClick={() => addCandidate(entity)}><Plus /> Add to Day</button>
            ) : (
              <button onClick={() => openDetails(entity ?? null, selected.kind === 'hotel')}>Details</button>
            )}
            <a href={navigate} target="_blank" rel="noreferrer"><Navigation /> Navigate <ExternalLink /></a>
          </div>
        </article>
      )}
    </section>
  );
}
