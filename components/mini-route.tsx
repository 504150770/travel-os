'use client';

import { ExternalLink, MapPin } from 'lucide-react';
import type { Day, Place } from '@/lib/types';

function normalize(points: Place[]) {
  const latitudes = points.map((point) => point.lat as number);
  const longitudes = points.map((point) => point.lng as number);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latSpan = Math.max(maxLat - minLat, 0.002);
  const lngSpan = Math.max(maxLng - minLng, 0.002);
  return points.map((point) => ({
    ...point,
    x: 34 + (((point.lng as number) - minLng) / lngSpan) * 252,
    y: 28 + (1 - ((point.lat as number) - minLat) / latSpan) * 116,
  }));
}

function googleRoute(points: Place[]) {
  if (!points.length) return '#';
  if (points.length === 1)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(points[0].mapQuery)}`;
  const [origin, ...rest] = points;
  const destination = rest.at(-1)!;
  const waypoints = rest.slice(0, -1).map((point) => point.mapQuery).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin.mapQuery)}&destination=${encodeURIComponent(destination.mapQuery)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}&travelmode=walking`;
}

export function MiniRoute({ day, places }: { day: Day; places: Place[] }) {
  const routed = day.timeline
    .map((stop) => places.find((place) => place.id === stop.placeId))
    .filter((place): place is Place => Boolean(place?.lat && place?.lng));
  const points = normalize(routed);

  if (!points.length) {
    return (
      <div className="route-empty">
        <MapPin size={18} />
        <div><strong>转场日</strong><span>具体班次未锁定，路线图保持待确认。</span></div>
      </div>
    );
  }

  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
  return (
    <div className="mini-route">
      <div className="route-canvas" aria-label={`Day ${day.day} Mini Route`}>
        <svg viewBox="0 0 320 172" aria-hidden="true">
          <defs>
            <linearGradient id={`line-${day.day}`} x1="0" x2="1">
              <stop stopColor="#a36c45" />
              <stop offset="1" stopColor="#315f58" />
            </linearGradient>
          </defs>
          <path d="M18 32C95 2 245 18 302 58M12 144C91 122 235 156 308 120" className="route-contour" />
          {points.length > 1 && <polyline points={polyline} fill="none" stroke={`url(#line-${day.day})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
          {points.map((point, index) => (
            <g key={point.id}>
              <circle cx={point.x} cy={point.y} r="11" className="route-dot" />
              <text x={point.x} y={point.y + 4} textAnchor="middle">{index + 1}</text>
            </g>
          ))}
        </svg>
        <div className="route-labels">
          {points.map((point, index) => <span key={point.id}><b>{index + 1}</b>{point.name}</span>)}
        </div>
      </div>
      <a className="route-open" href={googleRoute(routed)} target="_blank" rel="noreferrer">
        Google 打开整日路线 <ExternalLink size={15} />
      </a>
    </div>
  );
}
