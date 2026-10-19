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
import { navigationForEntity } from '@/features/trip/entityNavigation';
import type { PlanPresentationRow } from '@/features/trip/tripPresentationModel';
import { selectCoverImage } from '@/lib/media';
import { StatusBadge } from '@/components/trip/TripStatusBadge';

function connectorLabel(leg: DayRoute['legs'][number]) {
  if (leg.recommendedMode === 'Walk')
    return leg.walkMin == null ? '步行 · 出发前核实' : `步行 ${leg.walkMin} min · ${leg.distanceKm} km`;
  if (leg.recommendedMode === 'Taxi') return `出租车 · ${leg.taxiTime}`;
  return leg.transitMin == null ? '公共交通 · 出发前核实' : `公共交通 · ${leg.transitMin} min`;
}

type RouteLeg = DayRoute['legs'][number];
type Connector = { leg: RouteLeg; showOrigin: boolean };

// Match existing route legs to stops in Current Plan order. Activity/hotel rows are not
// route nodes, so they neither receive a connector nor advance the node cursor.
function assignConnectors(rows: PlanPresentationRow[], route: Pick<DayRoute, 'legs'> & { hotelId?: string | null }) {
  const hotelId = route.hotelId ?? null;
  const used = new Set<string>();
  const unused = (leg: RouteLeg) => !used.has(leg.id);
  let lastNodeId = hotelId;
  const connectors = rows.map(({ entity }, index): Connector | null => {
    if (['hotel', 'activity'].includes(entity.type)) return null;
    const leg = route.legs.find((candidate) => unused(candidate) && candidate.toId === entity.id && candidate.fromId === lastNodeId)
      ?? route.legs.find((candidate) => unused(candidate) && candidate.toId === entity.id && candidate.toId !== hotelId);
    lastNodeId = entity.id;
    if (!leg) return null;
    used.add(leg.id);
    return { leg, showOrigin: leg.fromId !== rows[index - 1]?.entity.id };
  });
  const returnLeg = hotelId
    ? route.legs.find((candidate) => unused(candidate) && candidate.toId === hotelId && candidate.fromId === lastNodeId)
      ?? route.legs.findLast((candidate) => unused(candidate) && candidate.toId === hotelId)
    : undefined;
  const returnConnector: Connector | null = returnLeg
    ? { leg: returnLeg, showOrigin: returnLeg.fromId !== rows.at(-1)?.entity.id }
    : null;
  return { connectors, returnConnector };
}

function RouteConnector({ connector, returning, selectedLegId, selectLeg }: {
  connector: Connector;
  returning?: boolean;
  selectedLegId: string | null;
  selectLeg: (id: string | null) => void;
}) {
  const { leg, showOrigin } = connector;
  const selected = selectedLegId === leg.id;
  return <button
    className={`workspace-connector ${returning ? 'return' : ''} ${selected ? 'selected' : ''}`}
    aria-pressed={selected}
    aria-label={`${leg.from} ${returning ? '返回' : '前往'} ${leg.to}：${connectorLabel(leg)}`}
    onClick={() => selectLeg(selected ? null : leg.id)}
  ><span /><b>{showOrigin && <small className="workspace-connector-origin">{leg.from} →</small>}{returning && <small className="workspace-connector-origin">返回 {leg.to} ·</small>}{connectorLabel(leg)}</b></button>;
}

function activityIllustration(name: string): { kind: string; label: string; Icon: LucideIcon } {
  if (/机场|航班|飞往|起飞|落地/.test(name)) return { kind: 'flight', label: '航班', Icon: Plane };
  if (/步行|散步/.test(name)) return { kind: 'walk', label: '步行', Icon: Footprints };
  if (/排队|缓冲|等候|安检/.test(name)) return { kind: 'buffer', label: '缓冲', Icon: Clock3 };
  if (/转场|火车|巴士|地铁|Transfer|前往|返回/.test(name)) return { kind: 'transfer', label: '转场', Icon: TrainFront };
  if (/咖啡/.test(name)) return { kind: 'coffee', label: '咖啡', Icon: Coffee };
  if (/早餐|午餐|晚餐|用餐/.test(name)) return { kind: 'meal', label: '用餐', Icon: Utensils };
  if (/抵达|入住|退房|酒店|休息|行李/.test(name)) return { kind: 'rest', label: '休息', Icon: BedDouble };
  if (/自由|弹性/.test(name)) return { kind: 'free', label: '自由活动', Icon: Compass };
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
  const navigation = navigationForEntity(entity);
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
      <button className="workspace-stop-photo" onClick={select} aria-pressed={selected} aria-label={`选择 ${entity.name}`}>
        {cover && entity.type !== 'activity'
          ? <Image unoptimized src={cover.file} alt={cover.title || entity.name} fill sizes="72px" />
          : <ActivityIllustration name={entity.name} />}
      </button>
      <button className="workspace-stop-copy" onClick={select} aria-pressed={selected}>
        <div className="workspace-stop-title"><h3>{entity.name}</h3></div>
        <div className="workspace-stop-meta"><StatusBadge status={presentation.status} /><p><TicketCheck /> {presentation.supportingLabel}</p></div>
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
        {navigation.google && <a href={navigation.google} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}><Navigation /> 导航</a>}
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
    listRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [dayId]);
  useEffect(() => {
    if (!selectedPointId) return;
    listRef.current?.querySelector<HTMLElement>(`[data-entity-id="${CSS.escape(selectedPointId)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedPointId]);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) actions.reorderWithin(dayId, String(active.id), String(over.id));
  };
  const { connectors, returnConnector } = assignConnectors(rows, route);
  return (
    <div className="workspace-timeline" ref={listRef}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={rows.map(({ item }) => item.id)} strategy={verticalListSortingStrategy}>
          {rows.map(({ item, entity }, index) => {
            const connector = connectors[index];
            return (
              <div key={item.id}>
                {connector && <RouteConnector connector={connector} selectedLegId={selectedLegId} selectLeg={selectLeg} />}
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
      {returnConnector && <RouteConnector connector={returnConnector} returning selectedLegId={selectedLegId} selectLeg={selectLeg} />}
      {!rows.length && <div className="workspace-empty"><b>当天暂无安排</b><p>通过“查找地点”添加当天安排。</p></div>}
    </div>
  );
}
