'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { DayRoute } from '@/lib/types';
import { routeCoordinateOrder, type MobileMapPoint } from '@/features/mobile/mobileModel';
import { MOBILE_TILE_PROVIDER } from '@/components/mobile/map/mapProvider';

const markerColors: Record<MobileMapPoint['kind'], string> = {
  hotel: '#222222',
  stop: '#5dade2',
  food: '#de8f42',
  gym: '#48a868',
};

export default function MobileMapCanvas({
  points,
  route,
  onSelect,
}: {
  points: MobileMapPoint[];
  route: DayRoute;
  onSelect: (point: MobileMapPoint) => void;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!nodeRef.current || !points.length) return;
    const map = L.map(nodeRef.current, {
      zoomControl: false,
      attributionControl: true,
    });
    mapRef.current = map;
    L.tileLayer(MOBILE_TILE_PROVIDER.url, {
      attribution: MOBILE_TILE_PROVIDER.attribution,
      maxZoom: MOBILE_TILE_PROVIDER.maxZoom,
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);

    points.forEach((point, index) => {
      const label = point.kind === 'hotel' ? 'H' : String(index);
      const icon = L.divIcon({
        className: 'mobile-map-marker-wrap',
        html: `<span class="mobile-map-marker" style="--marker-color:${markerColors[point.kind]}">${label}</span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      L.marker([point.lat, point.lng], { icon })
        .addTo(map)
        .on('click', () => onSelect(point));
    });

    const ordered = routeCoordinateOrder(route, points);
    if (ordered.length > 1) {
      L.polyline(ordered, {
        color: '#5dade2',
        weight: 4,
        opacity: 0.85,
        dashArray: '2 8',
        lineCap: 'round',
      }).addTo(map);
    }
    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
    if (points.length === 1) map.setView(bounds.getCenter(), 14);
    else map.fitBounds(bounds, { padding: [38, 64], maxZoom: 15 });
    window.setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onSelect, points, route]);

  if (!points.length) {
    return (
      <div className="mobile-map-empty">
        <b>Map points unavailable</b>
        <p>当天项目缺少经过核实的坐标，请继续使用路线列表和 Google Maps 导航。</p>
      </div>
    );
  }
  return <div ref={nodeRef} className="mobile-map-canvas" aria-label="当天路线地图" />;
}
