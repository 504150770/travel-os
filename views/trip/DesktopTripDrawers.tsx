'use client';

import Image from 'next/image';
import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { normalizeRouteCity, type Entity, type EntityType } from '@/lib/entity-library';
import type { Day } from '@/lib/types';
import type { DerivedDayState } from '@/lib/derive-current-day';
import type { LightboxImage } from '@/features/app/appModel';
import { yuan } from '@/features/app/appModel';
import type { useEditablePlan } from '@/hooks/use-editable-plan';
import { useDialogLifecycle } from '@/hooks/use-dialog-lifecycle';
import { TodayAtGlance } from '@/components/execution-cards';
import { DayFood } from '@/views/trip/DayFood';
import { DayGym } from '@/views/trip/DayGym';
import { AlternativePool } from '@/views/trip/CurrentPlan';
import { TonightStay, TravelDayCard } from '@/views/trip/TripSupport';
import { EntityActions, Media } from '@/views/shared/EntityUi';
import { selectCoverImage } from '@/lib/media';

function DesktopDrawer({ open, close, eyebrow, title, children, className = '' }: {
  open: boolean; close: () => void; eyebrow: string; title: string; children: ReactNode; className?: string;
}) {
  const dialogRef = useDialogLifecycle(close, open);
  if (!open) return null;
  return <div className="workspace-drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <dialog ref={dialogRef} open aria-modal="true" aria-label={title} className={`workspace-drawer ${className}`}>
      <header><div><span>{eyebrow}</span><h2>{title}</h2></div><button onClick={close} aria-label="关闭"><X /></button></header>
      <div className="workspace-drawer-body">{children}</div>
    </dialog>
  </div>;
}

export function DayDetailsDrawer({
  open,
  close,
  day,
  dayState,
  entities,
  resolve,
  actions,
  openGallery,
  preferredTransport,
  actionStatuses,
  privateLinks,
  openGym,
}: {
  open: boolean; close: () => void; day: Day; dayState: DerivedDayState; entities: Entity[];
  resolve: (id: string) => Entity | undefined; actions: ReturnType<typeof useEditablePlan>;
  openGallery: (image: LightboxImage) => void; preferredTransport: Record<string, string>;
  actionStatuses: Record<string, string>; privateLinks: Record<string, string>;
  openGym: (entity: Entity) => void;
}) {
  const planDay = actions.plan.days[day.day - 1];
  return <DesktopDrawer open={open} close={close} eyebrow={`DAY ${day.day} CONTEXT`} title="Day details" className="day-details-drawer">
    <TodayAtGlance day={day} route={dayState.route} />
    <TravelDayCard dayId={day.day} preferredTransport={preferredTransport} actionStatuses={actionStatuses} privateLinks={privateLinks} />
    <TonightStay day={day} />
    <section className="workspace-detail-note"><span>RUNNING LATE?</span><h3>晚了就删，不追进度</h3><p>{day.lossCut}</p></section>
    <section className="workspace-detail-note"><span>DAY BUDGET</span><h3>{yuan(dayState.knownCostCny || day.dayBudget)}</h3><p>{dayState.knownCostCny ? `Current Plan 已知费用 · ${dayState.unknownCostCount}项待确认` : day.budgetLabel}</p></section>
    <DayFood dayId={day.day} dayState={dayState} entities={entities} actions={actions} open={openGallery} />
    <DayGym day={day} dayState={dayState} gyms={entities.filter((entity) => entity.type === 'gym' && day.gymIds.includes(entity.id)).slice(0, 2)} actions={actions} openDetail={openGym} />
    <AlternativePool dayId={day.day} items={planDay.alternatives.filter((item) => !['restaurant', 'cafe', 'gym'].includes(resolve(item.entityId)?.type ?? ''))} removed={planDay.removedItems ?? []} resolve={resolve} actions={actions} open={openGallery} />
  </DesktopDrawer>;
}

const exploreTabs: Array<[string, string, EntityType[]]> = [
  ['places', 'Places', ['place', 'photo_spot']],
  ['food', 'Food', ['restaurant', 'cafe']],
  ['gym', 'Gym', ['gym']],
  ['shopping', 'Shopping', ['shopping']],
];

export function ExploreDrawer({
  open,
  close,
  city,
  entities,
  dayId,
  actions,
  inspect,
  onAdd,
  onCandidates,
  openCustom,
}: {
  open: boolean; close: () => void; city: string; entities: Entity[]; dayId: number;
  actions: ReturnType<typeof useEditablePlan>; inspect: (entity: Entity) => void;
  onAdd: (entity: Entity) => void; onCandidates: (entities: Entity[]) => void; openCustom: () => void;
}) {
  const [tab, setTab] = useState('places');
  const [query, setQuery] = useState('');
  const types = exploreTabs.find(([id]) => id === tab)?.[2] ?? exploreTabs[0][2];
  const shown = useMemo(() => entities.filter((entity) =>
    normalizeRouteCity(entity.city) === normalizeRouteCity(city) && types.includes(entity.type) &&
    `${entity.name} ${entity.description} ${entity.tags.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()),
  ).sort((a, b) => Number(a.raw.hotelPriority ?? 99) - Number(b.raw.hotelPriority ?? 99)).slice(0, 24), [city, entities, query, types]);
  useEffect(() => {
    onCandidates(open ? shown.filter((entity) => entity.coordinates).slice(0, 12) : []);
  }, [onCandidates, open, shown]);
  return <DesktopDrawer open={open} close={() => { onCandidates([]); close(); }} eyebrow="EXPLORE" title={`Add to Day ${dayId}`} className="explore-drawer">
    <label className="workspace-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search places, food, gym…" /></label>
    <div className="workspace-explore-tabs">{exploreTabs.map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>
    <div className="workspace-explore-list">{shown.map((entity) => {
      const cover = selectCoverImage(entity.images);
      const placement = actions.placement(entity.id, dayId);
      return <article key={entity.id}>
        <button className="workspace-explore-main" onClick={() => inspect(entity)}>
          <span>{cover ? <Image unoptimized src={cover.file} alt="" fill sizes="76px" /> : entity.type.slice(0, 1).toUpperCase()}</span>
          <div><small>{entity.type}</small><h3>{entity.name}</h3><p>{entity.priceLabel}</p></div>
        </button>
        <button disabled={Boolean(placement)} onClick={() => onAdd(entity)}>{placement ? `Day ${placement.dayId} 已加入` : '+ Add to Day'}</button>
      </article>;
    })}</div>
    <button className="workspace-custom-add" onClick={openCustom}>+ Add custom item</button>
  </DesktopDrawer>;
}

export function EntityDetailDrawer({
  entity,
  close,
  dayId,
  actions,
  openGallery,
}: {
  entity: Entity | null; close: () => void; dayId: number;
  actions: ReturnType<typeof useEditablePlan>; openGallery: (image: LightboxImage) => void;
}) {
  return <DesktopDrawer open={Boolean(entity)} close={close} eyebrow={entity?.type.toUpperCase() ?? 'DETAIL'} title={entity?.name ?? 'Place details'} className="entity-workspace-drawer">
    {entity && <>
      <Media images={entity.images} entityId={entity.id} name={entity.name} open={openGallery} hero />
      <p className="workspace-entity-description">{entity.description || entity.notes || '现场信息以官方页面为准。'}</p>
      <dl className="workspace-entity-facts"><div><dt>Price / ticket</dt><dd>{entity.priceLabel}</dd></div><div><dt>Opening</dt><dd>{entity.openingHours}</dd></div><div><dt>Address</dt><dd>{entity.address}</dd></div><div><dt>Checked</dt><dd>{entity.lastVerified}</dd></div></dl>
      <EntityActions entity={entity} selectedDay={dayId} addEntity={actions.addEntity} placement={actions.placement} />
    </>}
  </DesktopDrawer>;
}
