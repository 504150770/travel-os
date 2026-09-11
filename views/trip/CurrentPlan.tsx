'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Navigation, RotateCcw, TicketCheck } from 'lucide-react';
import { guideData } from '@/lib/data';
import type { Booking } from '@/lib/types';
import type { Entity } from '@/lib/entity-library';
import { useEditablePlan, type PlanItem } from '@/hooks/use-editable-plan';
import type { LightboxImage } from '@/features/app/appModel';
import { mapLinks, ticketBookingByEntity } from '@/features/trip/tripModel';
import { Media } from '@/views/shared/EntityUi';

export function PlanStop({
  item,
  entity,
  dayId,
  index,
  total,
  open,
  actions,
  bookingStatuses,
}: {
  item: PlanItem;
  entity: Entity;
  dayId: number;
  index: number;
  total: number;
  open: (image: LightboxImage) => void;
  actions: ReturnType<typeof useEditablePlan>;
  bookingStatuses: Record<string, string>;
}) {
  const [more, setMore] = useState(false);
  const links = mapLinks(entity);
  const bookingId = ticketBookingByEntity[entity.id];
  const booking = bookingId
    ? (guideData.bookings.items as Booking[]).find(
        (row) => row.id === bookingId,
      )
    : undefined;
  const ticketState = booking
    ? (bookingStatuses[booking.id] ?? booking.status)
    : item.ticket;
  return (
    <article className="editable-stop">
      <div className="stop-time">
        <input
          aria-label={`${entity.name}时间`}
          value={item.time}
          onChange={(event) =>
            actions.updateItem(dayId, item.id, { time: event.target.value })
          }
        />
        <span>{item.duration}</span>
      </div>
      <div className="stop-content">
        <div className="stop-title">
          <div>
            <small>{entity.type}</small>
            <h3>{entity.name}</h3>
          </div>
          <span className="ticket-chip">
            <TicketCheck />
            {ticketState}
          </span>
        </div>
        <Media images={entity.images} entityId={entity.id} name={entity.name} open={open} />
        <p>{item.notes || entity.description}</p>
        <div className="stop-core-actions">
          <button
            disabled={index === 0}
            onClick={() => actions.moveWithin(dayId, item.id, -1)}
            aria-label="上移"
          >
            <ArrowUp />
          </button>
          <button
            disabled={index === total - 1}
            onClick={() => actions.moveWithin(dayId, item.id, 1)}
            aria-label="下移"
          >
            <ArrowDown />
          </button>
          <button
            onClick={() =>
              actions.transfer(dayId, item.id, 'activeItems', 'alternatives')
            }
          >
            加入备选
          </button>
          <a href={links.google} target="_blank" rel="noreferrer">
            <Navigation />
            导航
          </a>
          <button onClick={() => setMore(!more)}>•••</button>
        </div>
        {more && (
          <div className="more-actions">
            <label>
              换到
              <select
                value={dayId}
                onChange={(event) =>
                  actions.moveDay(dayId, item.id, Number(event.target.value))
                }
              >
                {guideData.days.map((day) => (
                  <option key={day.day} value={day.day}>
                    Day {day.day}
                  </option>
                ))}
              </select>
            </label>
            <a href={links.xhs} target="_blank" rel="noreferrer">
              XHS攻略
            </a>
            <button
              onClick={() =>
                actions.transfer(dayId, item.id, 'activeItems', 'removedItems')
              }
            >
              移除
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function AlternativePool({
  dayId,
  items,
  removed,
  resolve,
  actions,
  open,
}: {
  dayId: number;
  items: PlanItem[];
  removed: PlanItem[];
  resolve: (id: string) => Entity | undefined;
  actions: ReturnType<typeof useEditablePlan>;
  open: (image: LightboxImage) => void;
}) {
  return (
    <section id="day-backup" className="section-card alternative-pool">
      <div className="section-title">
        <div>
          <span>BACKUP / ALTERNATIVES</span>
          <h2>当天备选池</h2>
        </div>
        <RotateCcw />
      </div>
      <div className="alternative-list">
        {items.map((item) => {
          const entity = resolve(item.entityId);
          if (!entity) return null;
          return (
            <article key={item.id}>
              <Media
                images={entity.images}
                entityId={entity.id}
                name={entity.name}
                open={open}
              />
              <div>
                <small>{entity.type}</small>
                <h3>{entity.name}</h3>
                <p>{entity.description || entity.notes}</p>
                <button
                  onClick={() =>
                    actions.transfer(
                      dayId,
                      item.id,
                      'alternatives',
                      'activeItems',
                    )
                  }
                >
                  加入今天
                </button>
                <button
                  onClick={() =>
                    actions.transfer(
                      dayId,
                      item.id,
                      'alternatives',
                      'removedItems',
                    )
                  }
                >
                  移除
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {removed.length > 0 && (
        <details className="removed-list">
          <summary>
            已移除 · {removed.length} <ChevronDown />
          </summary>
          {removed.map((item) => {
            const entity = resolve(item.entityId);
            return (
              entity && (
                <div key={item.id}>
                  <span>{entity.name}</span>
                  <button
                    onClick={() =>
                      actions.transfer(
                        dayId,
                        item.id,
                        'removedItems',
                        'alternatives',
                      )
                    }
                  >
                    恢复
                  </button>
                </div>
              )
            );
          })}
        </details>
      )}
    </section>
  );
}
