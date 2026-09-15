'use client';

import Image from 'next/image';
import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { Crosshair, ExternalLink, Navigation, Plus, RotateCcw } from 'lucide-react';
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

class DesktopMapBoundary extends Component<{ children: ReactNode; retry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  private retry = () => { this.setState({ failed: false }); this.props.retry(); };
  render() {
    if (this.state.failed) return <div className="workspace-map-empty"><b>Map temporarily unavailable</b><p>Timeline and Google Maps navigation remain available.</p><button onClick={this.retry}><RotateCcw /> Retry</button></div>;
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
  active,
  interactive,
  onStage,
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
  active: boolean;
  interactive: boolean;
  onStage?: (stage: MapRenderStage) => void;
}) {
  const [routeStatus, setRouteStatus] = useState<RouteGeometryState['status']>('loading');
  const [mapStage, setMapStage] = useState<MapRenderStage | 'shell'>('shell');
  const [retryKey, setRetryKey] = useState(0);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const selected = points.find((point) => point.id === selectedPointId) ?? null;
  const entity = selected?.entityId ? resolve(selected.entityId) : undefined;
  const navigate = entity
    ? mapLinks(entity).google
    : selected
      ? `https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`
      : '#';
  return (
    <section className="workspace-map" aria-label="Interactive trip map">
      <DesktopMapBoundary key={retryKey} retry={() => setRetryKey((value) => value + 1)}>
        <Suspense fallback={<div className="workspace-map-loading"><Crosshair /><span>Loading map…</span></div>}>
          <MapCanvas
            key={retryKey}
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
            active={active}
            interactive={interactive}
            onRouteStatus={setRouteStatus}
            onMapStage={(stage) => { setMapStage(stage); onStage?.(stage); }}
            onMapError={() => setMapUnavailable(true)}
          />
        </Suspense>
      </DesktopMapBoundary>
      {mapUnavailable && <div className="workspace-map-unavailable"><b>Map temporarily unavailable</b><p>Timeline, Overview and Navigate remain available.</p><button onClick={() => { setMapUnavailable(false); setRetryKey((value) => value + 1); }}><RotateCcw /> Retry</button></div>}
      {points.length > 0 && mapStage !== 'tiles' && (
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
