'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/components/map/map.css';
import type { DayRoute } from '@/lib/types';
import { legCoordinatePair, routeCoordinateOrder, type MapPoint } from '@/features/map/mapModel';
import { MOBILE_TILE_PROVIDER } from '@/components/mobile/map/mapProvider';

const escapeText = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function markerHtml(point: MapPoint, selected: boolean) {
  const label = point.kind === 'hotel' ? 'H' : point.kind === 'candidate' ? '+' : `${point.order ?? ''}`;
  const photo = point.image?.startsWith('/')
    ? `<img src="${escapeText(point.image)}" alt="" />`
    : '';
  return `<span class="shared-map-marker ${point.kind} ${selected ? 'selected' : ''}">${photo}<i>${escapeText(label)}</i></span>`;
}

function fitMap(map: L.Map, points: MapPoint[]) {
  const anchors = points.filter((point) => point.kind === 'hotel' || point.kind === 'stop');
  const target = anchors.length ? anchors : points;
  if (!target.length) return;
  const bounds = L.latLngBounds(target.map((point) => [point.lat, point.lng]));
  if (target.length === 1) map.setView(bounds.getCenter(), 14, { animate: false });
  else map.fitBounds(bounds, { padding: [52, 72], maxZoom: 15, animate: false });
}

export default function MapCanvas({
  points,
  route,
  selectedPointId,
  selectedLegId = null,
  showRoute = true,
  fitToken,
  className = '',
  onSelect,
}: {
  points: MapPoint[];
  route: DayRoute;
  selectedPointId?: string | null;
  selectedLegId?: string | null;
  showRoute?: boolean;
  fitToken: string | number;
  className?: string;
  onSelect: (point: MapPoint) => void;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const markerRefs = useRef(new Map<string, L.Marker>());
  const selectRef = useRef(onSelect);
  const pointsRef = useRef(points);
  selectRef.current = onSelect;
  pointsRef.current = points;

  useEffect(() => {
    if (!nodeRef.current) return;
    const map = L.map(nodeRef.current, { zoomControl: false, attributionControl: true });
    mapRef.current = map;
    L.tileLayer(MOBILE_TILE_PROVIDER.url, {
      attribution: MOBILE_TILE_PROVIDER.attribution,
      maxZoom: MOBILE_TILE_PROVIDER.maxZoom,
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    fitMap(map, pointsRef.current);
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(nodeRef.current);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;
    markerLayer.clearLayers();
    markerRefs.current.clear();
    points.forEach((point) => {
      const size = selectedPointId === point.id ? 54 : point.kind === 'candidate' ? 38 : 46;
      const marker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({
          className: 'shared-map-marker-wrap',
          html: markerHtml(point, selectedPointId === point.id),
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }),
        zIndexOffset: selectedPointId === point.id ? 1000 : point.kind === 'candidate' ? 100 : 400,
        title: point.name,
      }).addTo(markerLayer).on('click', () => selectRef.current(point));
      markerRefs.current.set(point.id, marker);
    });
  }, [points, selectedPointId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPointId) return;
    const point = points.find((item) => item.id === selectedPointId);
    if (point && Number.isFinite(map.getZoom())) {
      map.panTo([point.lat, point.lng], { animate: true, duration: 0.32 });
    }
  }, [points, selectedPointId]);

  useEffect(() => {
    const routeLayer = routeLayerRef.current;
    if (!routeLayer) return;
    routeLayer.clearLayers();
    if (!showRoute) return;
    const ordered = routeCoordinateOrder(route, points);
    if (ordered.length > 1) {
      L.polyline(ordered, { color: '#d8eefb', weight: 9, opacity: 0.92, lineCap: 'round' }).addTo(routeLayer);
      L.polyline(ordered, { color: '#5dade2', weight: 4, opacity: 0.95, dashArray: '2 8', lineCap: 'round' }).addTo(routeLayer);
    }
    const selected = legCoordinatePair(route, points, selectedLegId);
    if (selected.length === 2) {
      L.polyline(selected, { color: '#2478ad', weight: 7, opacity: 0.9, lineCap: 'round' }).addTo(routeLayer);
    }
  }, [points, route, selectedLegId, showRoute]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    fitMap(map, pointsRef.current);
  }, [fitToken]);

  if (!points.length) {
    return <div className="shared-map-empty"><b>Map points unavailable</b><p>当天项目没有可核实坐标，请使用路线列表和 Google Maps 导航。</p></div>;
  }
  return <div ref={nodeRef} className={`shared-map-canvas ${className}`} aria-label="当天路线地图" />;
}
