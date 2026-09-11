'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/components/map/map.css';
import type { DayRoute } from '@/lib/types';
import { type MapPoint } from '@/features/map/mapModel';
import { MOBILE_TILE_PROVIDER } from '@/components/mobile/map/mapProvider';
import { useRouteGeometry, type RouteGeometryState } from '@/features/map/routing/useRouteGeometry';
import type { CurrentLocation } from '@/features/map/location/locationModel';

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
  currentLocation = null,
  locationFocusToken = 0,
  className = '',
  onSelect,
  onRouteStatus,
}: {
  points: MapPoint[];
  route: DayRoute;
  selectedPointId?: string | null;
  selectedLegId?: string | null;
  showRoute?: boolean;
  fitToken: string | number;
  currentLocation?: CurrentLocation | null;
  locationFocusToken?: number;
  className?: string;
  onSelect: (point: MapPoint) => void;
  onRouteStatus?: (status: RouteGeometryState['status']) => void;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const locationLayerRef = useRef<L.LayerGroup | null>(null);
  const markerRefs = useRef(new Map<string, L.Marker>());
  const selectRef = useRef(onSelect);
  const pointsRef = useRef(points);
  selectRef.current = onSelect;
  pointsRef.current = points;
  const routeGeometry = useRouteGeometry(route, points);

  useEffect(() => {
    if (!nodeRef.current) return;
    const map = L.map(nodeRef.current, { zoomControl: false, attributionControl: true });
    mapRef.current = map;
    L.tileLayer(MOBILE_TILE_PROVIDER.url, {
      attribution: MOBILE_TILE_PROVIDER.attribution,
      maxZoom: MOBILE_TILE_PROVIDER.maxZoom,
    }).addTo(map);
    map.attributionControl.addAttribution('Routing © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · <a href="https://routing.openstreetmap.de/about.html">FOSSGIS</a> · <a href="https://www.openstreetmap.org/fixthemap">Fix the map</a>');
    L.control.zoom({ position: 'topright' }).addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    locationLayerRef.current = L.layerGroup().addTo(map);
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
    onRouteStatus?.(routeGeometry.status);
  }, [onRouteStatus, routeGeometry.status]);

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
    routeGeometry.geometries.forEach((geometry) => {
      const selected = geometry.legId === selectedLegId;
      if (geometry.source === 'routed') {
        L.polyline(geometry.coordinates, {
          color: '#d8eefb', weight: selected ? 12 : 9, opacity: 0.94, lineCap: 'round', lineJoin: 'round',
        }).addTo(routeLayer);
        L.polyline(geometry.coordinates, {
          color: selected ? '#2478ad' : '#5dade2', weight: selected ? 6 : 4, opacity: 0.98, lineCap: 'round', lineJoin: 'round',
        }).addTo(routeLayer);
      } else {
        L.polyline(geometry.coordinates, {
          color: selected ? '#2478ad' : '#5dade2', weight: selected ? 6 : 4, opacity: 0.82,
          dashArray: '8 10', lineCap: 'round',
        }).addTo(routeLayer);
      }
    });
  }, [routeGeometry.geometries, selectedLegId, showRoute]);

  useEffect(() => {
    const layer = locationLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!currentLocation) return;
    L.circle([currentLocation.lat, currentLocation.lng], {
      radius: Math.max(8, currentLocation.accuracy),
      color: '#2478ad', fillColor: '#5dade2', fillOpacity: 0.12, opacity: 0.28, weight: 1,
    }).addTo(layer);
    L.circleMarker([currentLocation.lat, currentLocation.lng], {
      radius: 8, color: '#fff', fillColor: '#287fd1', fillOpacity: 1, weight: 3,
    }).bindTooltip('Your location').addTo(layer);
  }, [currentLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentLocation || locationFocusToken < 1) return;
    map.setView([currentLocation.lat, currentLocation.lng], Math.max(map.getZoom(), 15), { animate: true });
  }, [currentLocation, locationFocusToken]);

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
