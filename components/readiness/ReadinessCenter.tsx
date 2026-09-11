'use client';

import { Check, ChevronDown, Clock3, FileText, ShieldAlert } from 'lucide-react';
import type { AppController } from '@/features/app/useAppController';
import { buildReadiness, type ReadinessItem, type ReadinessSection } from '@/features/readiness/readinessModel';
import { useDocumentVault } from '@/features/documents/useDocumentVault';
import { updatePackingItem } from '@/features/packing/packingModel';
import '@/components/readiness/readiness.css';
import { guideData } from '@/lib/data';

const sections: Array<[ReadinessSection, string, string]> = [
  ['action', 'ACTION NEEDED', 'Do these now or within the next two weeks.'],
  ['before', 'BEFORE DEPARTURE', 'Planned work with a clear future window.'],
  ['waiting', 'WAITING', 'Blocked by release dates, emails or check-in links.'],
];

export function ReadinessCenter({ controller, compact = false }: { controller: AppController; compact?: boolean }) {
  const vault = useDocumentVault();
  const readiness = buildReadiness({
    now: controller.clock ?? new Date(), tripStart: guideData.trip.startDate,
    actions: controller.actionQueue, bookings: controller.bookings,
    packing: controller.packingItems, documents: vault.documents,
    privateLinks: controller.privateLinks,
  });
  const complete = (item: ReadinessItem) => {
    if (item.actionId) controller.setActionStatuses({ ...controller.actionStatuses, [item.actionId]: 'Done' });
    if (item.packingId) controller.setPackingItems(updatePackingItem(controller.packingItems, item.packingId, { packed: true }));
    if (item.bookingId) { controller.navigate('more'); controller.selectMoreTab('documents'); }
  };
  const renderItem = (item: ReadinessItem) => <article className="readiness-item" key={item.id}>
    <i className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</i>
    <div><h3>{item.title}</h3><p>{item.detail}</p><small><Clock3 /> {item.when}</small></div>
    {item.section !== 'waiting' && item.section !== 'ready' && <button onClick={() => complete(item)}>{item.source === 'document' ? <FileText /> : <Check />}{item.source === 'document' ? 'Add document' : 'Complete'}</button>}
  </article>;
  return <section className={`readiness-center ${compact ? 'compact' : ''}`}>
    <header className="readiness-summary"><div><span>EUROPE TRIP</span><h2>Travel Readiness</h2><p>One view of what matters now, later and after an external update.</p></div><div className="readiness-counts"><strong>{readiness.counts.action}<small>Action Needed</small></strong><strong>{readiness.counts.before}<small>Before Departure</small></strong><strong>{readiness.counts.waiting}<small>Waiting</small></strong></div></header>
    {sections.map(([id, label, note]) => <section className={`readiness-section ${id}`} key={id}><header><div><span>{label}</span><p>{note}</p></div><b>{readiness.sections[id].length}</b></header>{readiness.sections[id].length ? readiness.sections[id].map(renderItem) : <p className="readiness-empty"><Check /> Nothing here right now.</p>}</section>)}
    <details className="readiness-ready"><summary><span><Check /> READY · {readiness.counts.ready}</span><ChevronDown /></summary><div>{readiness.sections.ready.map(renderItem)}</div></details>
    <p className="readiness-local-note"><ShieldAlert /> Documents are stored locally on this device and are never included in readiness exports or JSON backup.</p>
  </section>;
}
