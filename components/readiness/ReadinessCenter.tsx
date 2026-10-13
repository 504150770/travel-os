'use client';

import { ArrowRight, Check, ChevronDown, Clock3, ShieldAlert } from 'lucide-react';
import type { AppController } from '@/features/app/useAppController';
import { buildReadiness, type ReadinessItem, type ReadinessSection } from '@/features/readiness/readinessModel';
import { useDocumentVault } from '@/features/documents/useDocumentVault';
import { updatePackingItem } from '@/features/packing/packingModel';
import '@/components/readiness/readiness.css';
import { guideData } from '@/lib/data';
import { ContextualDocumentButton } from '@/components/documents/ContextualDocumentButton';

const sections: Array<[ReadinessSection, string, string]> = [
  ['action', '优先处理', '现在或未来两周需要完成的事项。'],
  ['before', '出发前完成', '按时间窗口准备，不必一次做完。'],
  ['waiting', '等待更新', '等待放票、邮件或入住链接。'],
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
  };
  const renderItem = (item: ReadinessItem) => {
    const action = item.actionId ? controller.actionQueue.find((entry) => entry.id === item.actionId) : undefined;
    const canComplete = item.source !== 'document' && item.section !== 'waiting' && item.section !== 'ready';
    return <article className="readiness-item" key={item.id}>
    <i className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</i>
    <div><h3>{item.title}</h3><p>{item.detail}</p><small><Clock3 /> {item.when}</small></div>
    <div className="readiness-item-actions">
      {item.bookingId && <ContextualDocumentButton bookingId={item.bookingId} onAdd={controller.openDocumentForBooking} />}
      {action && <button className="readiness-open" onClick={() => controller.openAction(action)}>{action.target === 'checkin' ? '查看入住' : action.target === 'deadlines' ? '查看关键日期' : '查看待办'}<ArrowRight /></button>}
      {item.packingId && <button className="readiness-open" onClick={() => controller.openPackingItem(item.packingId!)}>查看行李清单<ArrowRight /></button>}
      {canComplete && <button className="readiness-complete" onClick={() => complete(item)}><Check />标记完成</button>}
    </div>
  </article>;
  };
  return <section className={`readiness-center ${compact ? 'compact' : ''}`}>
    <header className="readiness-summary"><div><h2>出发准备</h2><p>先处理重要事项，其余按计划慢慢完成。</p></div><div className="readiness-counts"><strong>{readiness.counts.action}<small>优先处理</small></strong><strong>{readiness.counts.before}<small>出发前完成</small></strong><strong>{readiness.counts.waiting}<small>等待更新</small></strong></div></header>
    {sections.map(([id, label, note]) => <section className={`readiness-section ${id}`} key={id}><header><div><span>{label}</span><p>{note}</p></div><b>{readiness.sections[id].length}</b></header>{readiness.sections[id].length ? readiness.sections[id].map(renderItem) : <p className="readiness-empty"><Check /> 暂无事项。</p>}</section>)}
    <details className="readiness-ready"><summary><span><Check /> 已准备好 · {readiness.counts.ready}</span><ChevronDown /></summary><div>{readiness.sections.ready.map(renderItem)}</div></details>
    <p className="readiness-local-note"><ShieldAlert /> 资料仅保存在本机，不包含在准备清单导出或 JSON 备份中。</p>
  </section>;
}
