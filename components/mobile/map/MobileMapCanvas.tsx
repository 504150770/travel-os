'use client';

import MapCanvas from '@/components/map/MapCanvas';
import type { DayRoute } from '@/lib/types';
import type { MobileMapPoint } from '@/features/mobile/mobileModel';

export default function MobileMapCanvas({
  points,
  route,
  onSelect,
}: {
  points: MobileMapPoint[];
  route: DayRoute;
  onSelect: (point: MobileMapPoint) => void;
}) {
  return <MapCanvas
    points={points}
    route={route}
    fitToken={route.day}
    className="mobile-map-canvas"
    onSelect={onSelect}
  />;
}
