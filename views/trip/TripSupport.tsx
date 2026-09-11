'use client';

import { useState } from 'react';
import { BedDouble, Navigation, Route } from 'lucide-react';
import { safePrivateLink } from '@/lib/private-links';
import { TransitExecutionCard } from '@/components/execution-cards';
import type { Day } from '@/lib/types';
import { checkinActionId } from '@/lib/action-queue';
import { hotelForNight, realStays, transitExecutions, transportSegments } from '@/features/trip/tripModel';
import { yuan } from '@/features/app/appModel';

export function TonightStay({ day }: { day: Day }) {
  const [copied, setCopied] = useState(false);
  const stay = hotelForNight(day.date);
  if (!stay)
    return (
      <section className="section-card tonight-stay empty">
        <BedDouble />
        <div>
          <span>TONIGHT</span>
          <h2>无欧洲住宿</h2>
          <p>{day.day === 1 ? '国际飞行夜' : '已退房 / 返程中'}</p>
        </div>
      </section>
    );
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.execution.address)}`;
  return (
    <section className="section-card tonight-stay">
      <div className="section-title">
        <div>
          <span>TONIGHT · CONFIRMED</span>
          <h2>{stay.hotelName}</h2>
        </div>
        <BedDouble />
      </div>
      <p>
        {stay.execution.roomType} · {stay.execution.bed}
      </p>
      <div className="stay-facts">
        <span>入住 {stay.execution.checkInTime}</span>
        <span>退房 {stay.execution.checkOutTime}</span>
        <span>{stay.execution.breakfastIncluded ? '含早餐' : '不含早餐'}</span>
        <span>
          寄存{' '}
          {stay.execution.luggage.early === 'UNVERIFIED'
            ? '待确认'
            : stay.execution.luggage.early}
        </span>
      </div>
      <div className="hotel-inline-actions">
        <a href={maps} target="_blank" rel="noreferrer">
          <Navigation />
          导航
        </a>
        <button
          onClick={async () => {
            await navigator.clipboard?.writeText(stay.execution.address);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          }}
        >
          {copied ? 'Copied ✓' : '复制地址'}
        </button>
      </div>
      <small>{stay.execution.address}</small>
    </section>
  );
}

export function TravelDayCard({
  dayId,
  preferredTransport,
  actionStatuses,
  privateLinks,
}: {
  dayId: number;
  preferredTransport: Record<string, string>;
  actionStatuses: Record<string, string>;
  privateLinks: Record<string, string>;
}) {
  const segment = transportSegments.find((item) => item.day === dayId);
  if (!segment) return null;
  const execution = transitExecutions.find((item) => item.day === dayId);
  if (execution)
    return (
      <TransitExecutionCard
        execution={execution}
        segment={segment}
        preferred={preferredTransport[segment.id]}
      />
    );
  const previous = realStays.find((stay) => stay.checkOut === segment.date);
  const next = realStays.find((stay) => stay.checkIn === segment.date);
  const preferred = segment.candidates.find(
    (candidate) => candidate.rank === preferredTransport[segment.id],
  );
  return (
    <section className="section-card travel-day-card">
      <div className="section-title">
        <div>
          <span>TRAVEL DAY · DOOR TO DOOR</span>
          <h2>{segment.route}</h2>
        </div>
        <Route />
      </div>
      <div className="travel-chain">
        {previous && (
          <div>
            <b>CHECK-OUT</b>
            <span>{previous.hotelName}</span>
            <small>
              {previous.execution.checkOutTime} · 寄存
              {previous.execution.luggage.early === 'UNVERIFIED'
                ? '待确认'
                : previous.execution.luggage.early}
            </small>
          </div>
        )}
        <div>
          <b>MOVE</b>
          <span>{segment.doorToDoor}</span>
          <small>{segment.recommendation}</small>
        </div>
        {next && (
          <div>
            <b>CHECK-IN</b>
            <span>{next.hotelName}</span>
            <small>
              {next.execution.checkInTime} · {next.execution.address}
            </small>
            <small>
              Online ·{' '}
              {actionStatuses[checkinActionId(next.id)] ??
                next.execution.onlineCheckIn.status}
            </small>
            {privateLinks[next.id] && (
              <a
                href={safePrivateLink(privateLinks[next.id])}
                target="_blank"
                rel="noreferrer"
              >
                打开私人入住链接
              </a>
            )}
          </div>
        )}
      </div>
      {preferred ? (
        <div className="preferred-trip-transport">
          <b>PREFERRED · {preferred.rank}</b>
          <span>
            {preferred.operator} · {preferred.service}
          </span>
          <small>
            {preferred.departure ?? '时间待确认'} →{' '}
            {preferred.arrival ?? '时间待确认'} · {preferred.duration} ·{' '}
            {preferred.priceCny == null
              ? '票价待确认'
              : yuan(preferred.priceCny)}{' '}
            · 23kg{' '}
            {preferred.baggage23kg == null
              ? '待确认'
              : preferred.baggage23kg
                ? '已含/铁路可带'
                : '未含'}
          </small>
        </div>
      ) : (
        <p className="verification-note">
          尚未选择Preferred；在 Plan → Transport 选择后会回流这里。
        </p>
      )}
      <p className="verification-note">△ 班次、票价和行李按出票页最终确认</p>
    </section>
  );
}
