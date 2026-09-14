'use client';

import MapCanvas from '@/components/map/MapCanvas';
import type { DayRoute } from '@/lib/types';
import type { MobileMapPoint } from '@/features/mobile/mobileModel';
import type { CurrentLocation } from '@/features/map/location/locationModel';
import type { RouteGeometryState } from '@/features/map/routing/useRouteGeometry';
import type { MapRenderStage } from '@/components/map/MapCanvas';

export default function MobileMapCanvas({
  points,
  route,
  onSelect,
  currentLocation,
  locationFocusToken,
  onRouteStatus,
  onMapStage,
}: {
  points: MobileMapPoint[];
  route: DayRoute;
  onSelect: (point: MobileMapPoint) => void;
  currentLocation: CurrentLocation | null;
  locationFocusToken: number;
  onRouteStatus: (status: RouteGeometryState['status']) => void;
  onMapStage: (stage: MapRenderStage) => void;
}) {
  return <MapCanvas
    points={points}
    route={route}
    fitToken={route.day}
    className="mobile-map-canvas"
    onSelect={onSelect}
    currentLocation={currentLocation}
    locationFocusToken={locationFocusToken}
    onRouteStatus={onRouteStatus}
    onMapStage={onMapStage}
  />;
}
