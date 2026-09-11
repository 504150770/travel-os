'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ArrowDown, ArrowUp, GripVertical, Navigation, TicketCheck } from 'lucide-react';
import type { Entity } from '@/lib/entity-library';
import type { Booking, DayRoute } from '@/lib/types';
import type { PlanDay, PlanItem, useEditablePlan } from '@/hooks/use-editable-plan';
import { mapLinks, ticketBookingByEntity } from '@/features/trip/tripModel';
import { guideData } from '@/lib/data';
import { selectCoverImage } from '@/lib/media';

function connectorLabel(leg: DayRoute['legs'][number]) {
  if (leg.recommendedMode === 'Walk')
    return leg.walkMin == null ? 'Walk · verify before leaving' : `Walk · ${leg.walkMin} min · ${leg.distanceKm} km`;
  if (leg.recommendedMode === 'Taxi') return `Taxi · ${leg.taxiTime}`;
  return leg.transitMin == null ? 'Transit · verify before leaving' : `Transit · ${leg.transitMin} min`;
}

function SortableStop({
  item,
  entity,
  index,
  total,
  dayId,
  selected,
  select,
  actions,
  bookingStatuses,
}: {
  item: PlanItem;
  entity: Entity;
  index: number;
  total: number;
  dayId: number;
  selected: boolean;
  select: () => void;
  actions: ReturnType<typeof useEditablePlan>;
  bookingStatuses: Record<string, string>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const cover = selectCoverImage(entity.images);
  const bookingId = ticketBookingByEntity[entity.id];
  const booking = bookingId
    ? (guideData.bookings.items as Booking[]).find((row) => row.id === bookingId)
    : undefined;
  const ticketState = booking ? (bookingStatuses[booking.id] ?? booking.status) : item.ticket;
  return (
    <article
      ref={setNodeRef}
      data-entity-id={entity.id}
      className={`workspace-stop ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${isDragging ? 1.01 : 1})` : undefined,
        transition,
      }}
    >
      <div className="workspace-stop-time">
        <input
          aria-label={`${entity.name}时间`}
          value={item.time}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => actions.updateItem(dayId, item.id, { time: event.target.value })}
        />
        <span>{item.duration}</span>
      </div>
      <button className="workspace-stop-photo" onClick={select} aria-label={`在地图中选择 ${entity.name}`}>
        {cover ? <Image unoptimized src={cover.file} alt="" fill sizes="72px" /> : <span>{index + 1}</span>}
      </button>
      <button className="workspace-stop-copy" onClick={select}>
        <small>{entity.type}</small>
        <h3>{entity.name}</h3>
        <p><TicketCheck /> {ticketState}</p>
      </button>
      <button
        className="workspace-drag-handle"
        aria-label={`拖动 ${entity.name}`}
        {...attributes}
        {...listeners}
        onClick={(event) => event.stopPropagation()}
      >
        <GripVertical />
      </button>
      <div className="workspace-stop-actions">
        <a href={mapLinks(entity).google} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}><Navigation /> Navigate</a>
        <button disabled={index === 0} onClick={(event) => { event.stopPropagation(); actions.moveWithin(dayId, item.id, -1); }} aria-label={`${entity.name}上移`}><ArrowUp /></button>
        <button disabled={index === total - 1} onClick={(event) => { event.stopPropagation(); actions.moveWithin(dayId, item.id, 1); }} aria-label={`${entity.name}下移`}><ArrowDown /></button>
      </div>
    </article>
  );
}

export function DesktopTripTimeline({
  dayId,
  planDay,
  route,
  resolve,
  selectedPointId,
  selectedLegId,
  selectPoint,
  selectLeg,
  actions,
  bookingStatuses,
}: {
  dayId: number;
  planDay: PlanDay;
  route: DayRoute;
  resolve: (id: string) => Entity | undefined;
  selectedPointId: string | null;
  selectedLegId: string | null;
  selectPoint: (id: string) => void;
  selectLeg: (id: string | null) => void;
  actions: ReturnType<typeof useEditablePlan>;
  bookingStatuses: Record<string, string>;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const rows = planDay.activeItems.flatMap((item) => {
    const entity = resolve(item.entityId);
    return entity ? [{ item, entity }] : [];
  });
  useEffect(() => {
    if (!selectedPointId) return;
    listRef.current?.querySelector<HTMLElement>(`[data-entity-id="${CSS.escape(selectedPointId)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedPointId]);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) actions.reorderWithin(dayId, String(active.id), String(over.id));
  };
  return (
    <div className="workspace-timeline" ref={listRef}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={rows.map(({ item }) => item.id)} strategy={verticalListSortingStrategy}>
          {rows.map(({ item, entity }, index) => {
            const previous = rows[index - 1]?.entity;
            const leg = route.legs.find((candidate) =>
              candidate.toId === entity.id && (index === 0 || candidate.fromId === previous?.id),
            );
            return (
              <div key={item.id}>
                {leg && <button className={`workspace-connector ${selectedLegId === leg.id ? 'selected' : ''}`} onClick={() => selectLeg(selectedLegId === leg.id ? null : leg.id)}><span /><b>{connectorLabel(leg)}</b></button>}
                <SortableStop
                  item={item}
                  entity={entity}
                  index={index}
                  total={rows.length}
                  dayId={dayId}
                  selected={selectedPointId === entity.id}
                  select={() => selectPoint(entity.id)}
                  actions={actions}
                  bookingStatuses={bookingStatuses}
                />
              </div>
            );
          })}
        </SortableContext>
      </DndContext>
      {!rows.length && <div className="workspace-empty"><b>No stops yet</b><p>Open Explore to add a place to this day.</p></div>}
    </div>
  );
}
