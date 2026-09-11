'use client';

import MapCanvas from '@/components/map/MapCanvas';
import type { DayRoute } from '@/lib/types';
import type { MobileMapPoint } from '@/features/mobile/mobileModel';
import type { CurrentLocation } from '@/features/map/location/locationModel';
import type { RouteGeometryState } from '@/features/map/routing/useRouteGeometry';

export default function MobileMapCanvas({
  points,
  route,
  onSelect,
  currentLocation,
  locationFocusToken,
  onRouteStatus,
}: {
  points: MobileMapPoint[];
  route: DayRoute;
  onSelect: (point: MobileMapPoint) => void;
  currentLocation: CurrentLocation | null;
  locationFocusToken: number;
  onRouteStatus: (status: RouteGeometryState['status']) => void;
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
  />;
}
