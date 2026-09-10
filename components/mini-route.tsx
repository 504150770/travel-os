'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  BusFront,
  CarTaxiFront,
  ExternalLink,
  Footprints,
  Hotel,
  MapPin,
  Navigation,
  X,
} from 'lucide-react';
import type {
  Day,
  DayRoute,
  DayRouteLeg,
  HotelBooking,
  Place,
} from '@/lib/types';
import { useDialogLifecycle } from '@/hooks/use-dialog-lifecycle';

function modeMeta(mode: DayRouteLeg['recommendedMode']) {
  if (mode === 'Walk')
    return {
      label: 'Walk',
      Icon: Footprints,
      google: 'walking',
    } as const;
  if (mode === 'Taxi')
    return {
      label: 'Taxi',
      Icon: CarTaxiFront,
      google: 'driving',
    } as const;
  return {
    label: 'Public transit',
    Icon: BusFront,
    google: 'transit',
  } as const;
}

function googleLeg(leg: DayRouteLeg, places: Place[], hotel?: HotelBooking) {
  const query = (id: string, fallback: string) =>
    id === hotel?.id
      ? hotel.execution.address
      : (places.find((place) => place.id === id)?.mapQuery ?? fallback);
  const mode = modeMeta(leg.recommendedMode).google;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(query(leg.fromId, leg.from))}&destination=${encodeURIComponent(query(leg.toId, leg.to))}&travelmode=${mode}`;
}

function googleOrder(route: DayRoute, places: Place[], hotel?: HotelBooking) {
  if (!route.legs.length) return '#';
  const ids = [route.legs[0].fromId, ...route.legs.map((leg) => leg.toId)];
  const names = [route.legs[0].from, ...route.legs.map((leg) => leg.to)];
  const query = (id: string, fallback: string) =>
    id === hotel?.id
      ? hotel.execution.address
      : (places.find((place) => place.id === id)?.mapQuery ?? fallback);
  const points = ids.map((id, index) => query(id, names[index]));
  const origin = points[0];
  const destination = points.at(-1)!;
  const waypoints = points.slice(1, -1).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}`;
}

function RouteMove({
  leg,
  places,
  hotel,
}: {
  leg: DayRouteLeg;
  places: Place[];
  hotel?: HotelBooking;
}) {
  if (leg.status !== 'ROUTED')
    return (
      <div className="route-flow-move pending-route">
        <span className="route-flow-line" />
        <MapPin />
        <div>
          <b>Route check</b>
          <strong>路线待计算</strong>
          <small>
            {leg.from} → {leg.to} · 点击导航获取实时路线
          </small>
        </div>
        <a
          href={googleLeg(leg, places, hotel)}
          target="_blank"
          rel="noreferrer"
        >
          <Navigation />
          导航
        </a>
      </div>
    );
  const { label, Icon } = modeMeta(leg.recommendedMode);
  return (
    <div className="route-flow-move">
      <span className="route-flow-line" />
      <Icon />
      <div>
        <b>{label}</b>
        {leg.recommendedMode === 'Walk' ? (
          <>
            <strong>
              {leg.walkMin == null
                ? '出发前复核'
                : `${leg.walkMin} min · ${leg.distanceKm} km`}
            </strong>
            <small>Taxi 备选 · {leg.taxiTime}</small>
          </>
        ) : leg.recommendedMode === 'Taxi' ? (
          <>
            <strong>{leg.taxiTime}</strong>
            <small>
              步行备选 ·{' '}
              {leg.walkMin == null ? '待复核' : `${leg.walkMin} min`}
            </small>
          </>
        ) : (
          <>
            <strong>
              {leg.transitMin == null
                ? '公交线路出发前复核'
                : `约 ${leg.transitMin} min`}
            </strong>
            <small>
              步行备选 ·{' '}
              {leg.walkMin == null ? '待复核' : `${leg.walkMin} min`} · Taxi
              备选 · {leg.taxiTime}
            </small>
          </>
        )}
      </div>
      <a href={googleLeg(leg, places, hotel)} target="_blank" rel="noreferrer">
        <Navigation />
        导航
      </a>
    </div>
  );
}

export function MiniRoute({
  day,
  places,
  route,
  hotel,
}: {
  day: Day;
  places: Place[];
  route: DayRoute;
  hotel?: HotelBooking;
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const closeMap = () => setMapOpen(false);
  const mapRef = useDialogLifecycle(closeMap, mapOpen);
  if (!route.legs.length)
    return (
      <div className="route-empty">
        <MapPin />
        <div>
          <strong>今天按转场执行卡行动</strong>
          <span>机场、车站、拖箱与延误处理都在上方卡片。</span>
        </div>
      </div>
    );
  const orderUrl = googleOrder(route, places, hotel);
  const firstUrl = googleLeg(route.legs[0], places, hotel);
  const lastUrl = googleLeg(route.legs.at(-1)!, places, hotel);
  return (
    <div className="route-flow">
      <div className="route-flow-head">
        <p>
          {route.summary.walkingKm ?? '—'} km walking · 路线{' '}
          {route.summary.transfers} 段 · 最长步行{' '}
          {route.summary.longestWalkMin ?? '—'} min
        </p>
        <button onClick={() => setMapOpen(true)}>
          <MapPin />
          查看地图
        </button>
      </div>
      <div className="route-flow-node hotel">
        <span>
          <Hotel />
        </span>
        <div>
          <small>出发</small>
          <h3>{hotel?.hotelName ?? route.atGlance.start}</h3>
          <p>{route.atGlance.mustLeaveHotel} 出发</p>
        </div>
      </div>
      {route.legs.map((leg, index) => {
        const stop = day.timeline.find((item) => item.placeId === leg.toId);
        const returning = leg.toId === route.hotelId;
        return (
          <div
            className="route-flow-step"
            key={leg.id}
            style={{ '--route-index': index } as CSSProperties}
          >
            <RouteMove leg={leg} places={places} hotel={hotel} />
            <a
              className={`route-flow-node ${returning ? 'hotel' : ''}`}
              href={returning ? lastUrl : googleLeg(leg, places, hotel)}
              target="_blank"
              rel="noreferrer"
            >
              <span>{returning ? <Hotel /> : index + 1}</span>
              <div>
                <small>{returning ? '返回' : (stop?.time ?? '抵达')}</small>
                <h3>{leg.to}</h3>
                <p>
                  {returning
                    ? `${route.summary.returnToHotel} 返回`
                    : `${stop?.duration ?? '停留时长待确认'} · ${stop?.ticket ?? '票务按当天页面'}`}
                </p>
              </div>
              <ExternalLink />
            </a>
          </div>
        );
      })}
      {mapOpen && (
        <div
          className="route-map-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && closeMap()
          }
        >
          <dialog
            ref={mapRef}
            open
            className="route-map-drawer"
            aria-label="Route overview"
            aria-modal="true"
          >
            <header>
              <div>
                <span>ROUTE OVERVIEW</span>
                <h2>地图只在需要时打开</h2>
              </div>
              <button onClick={closeMap} aria-label="关闭">
                <X />
              </button>
            </header>
            <ol>
              {[route.legs[0].from, ...route.legs.map((leg) => leg.to)].map(
                (name, index) => (
                  <li key={`${name}-${index}`}>
                    <b>{index + 1}</b>
                    {name}
                  </li>
                ),
              )}
            </ol>
            <p>
              地点顺序链接不代表完整混合交通路线；每一段请使用主流程中的“导航”。
            </p>
            <div>
              <a href={orderUrl} target="_blank" rel="noreferrer">
                Google Maps 查看地点顺序 <ExternalLink />
              </a>
              <a href={firstUrl} target="_blank" rel="noreferrer">
                From Hotel
              </a>
              <a href={lastUrl} target="_blank" rel="noreferrer">
                Back to Hotel
              </a>
            </div>
          </dialog>
        </div>
      )}
    </div>
  );
}
