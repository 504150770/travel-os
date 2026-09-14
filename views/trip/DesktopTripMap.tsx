'use client';

import Image from 'next/image';
import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { Crosshair, ExternalLink, Navigation, Plus } from 'lucide-react';
import type { Entity } from '@/lib/entity-library';
import type { DayRoute } from '@/lib/types';
import type { MapPoint } from '@/features/map/mapModel';
import { mapLinks } from '@/features/trip/tripModel';
import type { CurrentLocation } from '@/features/map/location/locationModel';
import { approximateDistanceLabel } from '@/features/map/location/locationModel';
import type { RouteGeometryState } from '@/features/map/routing/useRouteGeometry';
import type { MapRenderStage } from '@/components/map/MapCanvas';
import { loadMapCanvas } from '@/features/map/mapLoader';

const MapCanvas = lazy(loadMapCanvas);

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
  routePoints,
  route,
  selectedPointId,
  selectedLegId,
  showRoute,
  fitToken,
  selectPoint,
  resolve,
  openDetails,
  addCandidate,
  currentLocation,
  locationFocusToken,
}: {
  points: MapPoint[];
  routePoints: MapPoint[];
  route: DayRoute;
  selectedPointId: string | null;
  selectedLegId: string | null;
  showRoute: boolean;
  fitToken: string;
  selectPoint: (id: string) => void;
  resolve: (id: string) => Entity | undefined;
  openDetails: (entity: Entity | null, hotel: boolean) => void;
  addCandidate: (entity: Entity) => void;
  currentLocation: CurrentLocation | null;
  locationFocusToken: number;
}) {
  const [routeStatus, setRouteStatus] = useState<RouteGeometryState['status']>('loading');
  const [mapStage, setMapStage] = useState<MapRenderStage | 'shell'>('shell');
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
        <Suspense fallback={<div className="workspace-map-loading"><Crosshair /><span>Loading map…</span></div>}>
          <MapCanvas
            points={points}
            routePoints={routePoints}
            route={route}
            selectedPointId={selectedPointId}
            selectedLegId={selectedLegId}
            showRoute={showRoute}
            fitToken={fitToken}
            className="desktop-map-canvas"
            onSelect={(point) => selectPoint(point.id)}
            currentLocation={currentLocation}
            locationFocusToken={locationFocusToken}
            onRouteStatus={setRouteStatus}
            onMapStage={setMapStage}
          />
        </Suspense>
      </DesktopMapBoundary>
      {mapStage !== 'tiles' && (
        <output className="workspace-map-progress">
          {mapStage === 'shell' ? 'Loading map…' : mapStage === 'initialized' ? 'Adding today’s stops…' : 'Loading map detail…'}
        </output>
      )}
      <div className="workspace-map-disclaimer">
        {routeStatus === 'fallback' ? 'Dashed = route overview · detailed route unavailable' : routeStatus === 'cached' ? 'Solid = routed road · using cached route' : routeStatus === 'routed' ? 'Solid = routed road · dashed = route overview' : 'Loading detailed route…'}
      </div>
      {selected && (
        <article className="workspace-map-preview">
          {selected.image && <Image unoptimized src={selected.image} alt="" width={88} height={76} />}
          <div>
            <span>{selected.kind === 'hotel' ? 'HOTEL' : selected.kind.toUpperCase()}</span>
            <h2>{selected.name}</h2>
            <p>{selected.time ? `${selected.time} · ${selected.duration}` : selected.detail}</p>
            {currentLocation && <small>{approximateDistanceLabel(currentLocation, selected)} · approximate</small>}
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
