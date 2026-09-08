'use client';

import { BusFront, CarTaxiFront, ExternalLink, Footprints, Hotel, MapPin } from 'lucide-react';
import type { Day, DayRoute, HotelBooking, Place } from '@/lib/types';

type RoutePoint = { id: string; name: string; mapQuery: string; lat: number; lng: number; hotel?: boolean };

function normalize(points: RoutePoint[]) {
  const latitudes = points.map((point) => point.lat); const longitudes = points.map((point) => point.lng);
  const minLat = Math.min(...latitudes); const maxLat = Math.max(...latitudes); const minLng = Math.min(...longitudes); const maxLng = Math.max(...longitudes);
  const latSpan = Math.max(maxLat - minLat, 0.002); const lngSpan = Math.max(maxLng - minLng, 0.002);
  return points.map((point) => ({ ...point, x: 34 + ((point.lng - minLng) / lngSpan) * 252, y: 28 + (1 - (point.lat - minLat) / latSpan) * 116 }));
}

function googleRoute(points: RoutePoint[], travelMode: 'walking' | 'transit' = 'walking') {
  if (!points.length) return '#';
  if (points.length === 1) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(points[0].mapQuery)}`;
  const [origin, ...rest] = points; const destination = rest.at(-1)!; const waypoints = rest.slice(0, -1).map((point) => point.mapQuery).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin.mapQuery)}&destination=${encodeURIComponent(destination.mapQuery)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}&travelmode=${travelMode}`;
}

export function MiniRoute({ day, places, route, hotel }: { day: Day; places: Place[]; route: DayRoute; hotel?: HotelBooking }) {
  if (!route.legs.length) return <div className="route-empty"><MapPin size={18}/><div><strong>转场日</strong><span>按 Transit Day Execution Card 执行。</span></div></div>;
  const sights: RoutePoint[] = day.timeline.map((stop) => places.find((place) => place.id === stop.placeId)).filter((place): place is Place => Boolean(place?.lat && place?.lng)).map((place) => ({ id: place.id, name: place.name, mapQuery: place.mapQuery, lat: place.lat as number, lng: place.lng as number }));
  const hotelPoint: RoutePoint | null = hotel ? { id: hotel.id, name: hotel.hotelName, mapQuery: hotel.address, lat: hotel.coordinates.lat, lng: hotel.coordinates.lng, hotel: true } : null;
  const routed = hotelPoint && sights.length ? [hotelPoint, ...sights, ...(day.day === 17 ? [] : [hotelPoint])] : sights; const points = normalize(routed);
  if (!points.length) return <div className="route-empty"><MapPin size={18}/><div><strong>路线待地图复核</strong><span>当前没有可绘制坐标。</span></div></div>;
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
  const wholeMode = route.legs.some((leg) => leg.recommendedMode === 'Transit') ? 'transit' : 'walking';
  const firstMode = route.legs[0]?.recommendedMode === 'Transit' ? 'transit' : 'walking';
  const lastMode = route.legs.at(-1)?.recommendedMode === 'Transit' ? 'transit' : 'walking';
  return <div className="mini-route"><div className="route-canvas" aria-label={`Day ${day.day} Mini Route`}><svg viewBox="0 0 320 172" aria-hidden="true"><defs><linearGradient id={`line-${day.day}`} x1="0" x2="1"><stop stopColor="#a36c45"/><stop offset="1" stopColor="#315f58"/></linearGradient></defs><path d="M18 32C95 2 245 18 302 58M12 144C91 122 235 156 308 120" className="route-contour"/>{points.length > 1 && <polyline points={polyline} fill="none" stroke={`url(#line-${day.day})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>}{points.map((point,index)=><g key={`${point.id}-${index}`}><circle cx={point.x} cy={point.y} r="11" className={point.hotel ? 'route-dot hotel' : 'route-dot'}/><text x={point.x} y={point.y+4} textAnchor="middle">{index+1}</text></g>)}</svg><div className="route-labels">{points.map((point,index)=><span key={`${point.id}-${index}`}><b>{index+1}</b>{point.hotel && <Hotel/>}{point.name}</span>)}</div></div><div className="mini-route-legs">{route.legs.map((leg,index)=>{ const Icon=leg.recommendedMode==='Walk'?Footprints:leg.taxiTime==='待地图复核'?BusFront:CarTaxiFront; return <div key={leg.id}><b>{index+1}</b><Icon/><span>{leg.from} → {leg.to}</span><small>{leg.recommendedMode==='Walk' ? `${leg.walkMin}m walk · ${leg.distanceKm}km` : `Transit待复核 · Taxi ${leg.taxiTime}`}</small></div>;})}</div><div className="route-day-summary"><b>整日路线摘要</b><span>Walk {route.summary.walkingKm ?? '待核'} km / {route.summary.walkingMin ?? '待核'} min</span><span>Transit {route.summary.transitMin ?? '待地图复核'}</span><span>{route.summary.transfers} legs</span><span>Return {route.summary.returnToHotel}</span></div><div className="route-links"><a href={googleRoute(routed, wholeMode)} target="_blank" rel="noreferrer">Google 打开整日路线 <ExternalLink/></a>{hotelPoint && sights[0] && <a href={googleRoute([hotelPoint,sights[0]], firstMode)} target="_blank" rel="noreferrer">From Hotel</a>}{hotelPoint && sights.at(-1) && day.day!==17 && <a href={googleRoute([sights.at(-1)!,hotelPoint], lastMode)} target="_blank" rel="noreferrer">Back to Hotel</a>}</div></div>;
}
