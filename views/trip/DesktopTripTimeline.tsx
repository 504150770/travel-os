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
import {
  ArrowDown,
  ArrowUp,
  BedDouble,
  CalendarDays,
  Clock3,
  Coffee,
  Compass,
  Footprints,
  GripVertical,
  Navigation,
  Plane,
  TicketCheck,
  TrainFront,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import type { Entity } from '@/lib/entity-library';
import type { DayRoute } from '@/lib/types';
import type { PlanItem, useEditablePlan } from '@/hooks/use-editable-plan';
import { mapLinks } from '@/features/trip/tripModel';
import type { PlanPresentationRow } from '@/features/trip/tripPresentationModel';
import { selectCoverImage } from '@/lib/media';
import { StatusBadge } from '@/components/trip/TripStatusBadge';

function connectorLabel(leg: DayRoute['legs'][number]) {
  if (leg.recommendedMode === 'Walk')
    return leg.walkMin == null ? '步行 · 出发前核实' : `步行 ${leg.walkMin} min · ${leg.distanceKm} km`;
  if (leg.recommendedMode === 'Taxi') return `出租车 · ${leg.taxiTime}`;
  return leg.transitMin == null ? '公共交通 · 出发前核实' : `公共交通 · ${leg.transitMin} min`;
}

function activityIllustration(name: string): { kind: string; label: string; Icon: LucideIcon } {
  if (/机场|航班|飞往|起飞|落地/.test(name)) return { kind: 'flight', label: '航班', Icon: Plane };
  if (/步行|散步/.test(name)) return { kind: 'walk', label: '步行', Icon: Footprints };
  if (/咖啡/.test(name)) return { kind: 'coffee', label: '咖啡', Icon: Coffee };
  if (/早餐|午餐|晚餐|用餐/.test(name)) return { kind: 'meal', label: '用餐', Icon: Utensils };
  if (/排队|缓冲|等候|安检/.test(name)) return { kind: 'buffer', label: '缓冲', Icon: Clock3 };
  if (/抵达|入住|退房|酒店|休息|行李/.test(name)) return { kind: 'rest', label: '休息', Icon: BedDouble };
  if (/自由|弹性/.test(name)) return { kind: 'free', label: '自由活动', Icon: Compass };
  if (/转场|火车|巴士|地铁|Transfer|前往|返回/.test(name)) return { kind: 'transfer', label: '转场', Icon: TrainFront };
  return { kind: 'activity', label: '活动', Icon: CalendarDays };
}

function ActivityIllustration({ name }: { name: string }) {
  const { kind, label, Icon } = activityIllustration(name);
  return <span className="workspace-activity-illustration" data-kind={kind} title={`${label}通用插图`} aria-hidden="true"><Icon /><small>{label}</small></span>;
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
  presentation,
}: {
  item: PlanItem;
  entity: Entity;
  index: number;
  total: number;
  dayId: number;
  selected: boolean;
  select: () => void;
  actions: ReturnType<typeof useEditablePlan>;
  presentation: PlanPresentationRow;
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
        {cover && entity.type !== 'activity'
          ? <Image unoptimized src={cover.file} alt={cover.title || entity.name} fill sizes="72px" />
          : <ActivityIllustration name={entity.name} />}
      </button>
      <button className="workspace-stop-copy" onClick={select}>
        <div className="workspace-stop-title"><h3>{entity.name}</h3><StatusBadge status={presentation.status} /></div>
        <p><TicketCheck /> {presentation.supportingLabel}</p>
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
        <a href={mapLinks(entity).google} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}><Navigation /> 导航</a>
        <button disabled={index === 0} onClick={(event) => { event.stopPropagation(); actions.moveWithin(dayId, item.id, -1); }} aria-label={`${entity.name}上移`}><ArrowUp /></button>
        <button disabled={index === total - 1} onClick={(event) => { event.stopPropagation(); actions.moveWithin(dayId, item.id, 1); }} aria-label={`${entity.name}下移`}><ArrowDown /></button>
      </div>
    </article>
  );
}

export function DesktopTripTimeline({
  dayId,
  rows,
  route,
  selectedPointId,
  selectedLegId,
  selectPoint,
  selectLeg,
  actions,
}: {
  dayId: number;
  rows: PlanPresentationRow[];
  route: DayRoute;
  selectedPointId: string | null;
  selectedLegId: string | null;
  selectPoint: (id: string) => void;
  selectLeg: (id: string | null) => void;
  actions: ReturnType<typeof useEditablePlan>;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
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
                  presentation={rows[index]}
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
