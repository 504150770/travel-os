'use client';

import { Check, ChevronDown, Clock3, FileText, ShieldAlert } from 'lucide-react';
import type { AppController } from '@/features/app/useAppController';
import { buildReadiness, type ReadinessItem, type ReadinessSection } from '@/features/readiness/readinessModel';
import { useDocumentVault } from '@/features/documents/useDocumentVault';
import { updatePackingItem } from '@/features/packing/packingModel';
import '@/components/readiness/readiness.css';
import { guideData } from '@/lib/data';

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
    if (item.bookingId) { controller.navigate('more'); controller.selectMoreTab('documents'); }
  };
  const renderItem = (item: ReadinessItem) => <article className="readiness-item" key={item.id}>
    <i className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</i>
    <div><h3>{item.title}</h3><p>{item.detail}</p><small><Clock3 /> {item.when}</small></div>
    {item.section !== 'waiting' && item.section !== 'ready' && <button onClick={() => complete(item)}>{item.source === 'document' ? <FileText /> : <Check />}{item.source === 'document' ? '添加资料' : '标记完成'}</button>}
  </article>;
  return <section className={`readiness-center ${compact ? 'compact' : ''}`}>
    <header className="readiness-summary"><div><h2>出发准备</h2><p>先处理重要事项，其余按计划慢慢完成。</p></div><div className="readiness-counts"><strong>{readiness.counts.action}<small>优先处理</small></strong><strong>{readiness.counts.before}<small>出发前完成</small></strong><strong>{readiness.counts.waiting}<small>等待更新</small></strong></div></header>
    {sections.map(([id, label, note]) => <section className={`readiness-section ${id}`} key={id}><header><div><span>{label}</span><p>{note}</p></div><b>{readiness.sections[id].length}</b></header>{readiness.sections[id].length ? readiness.sections[id].map(renderItem) : <p className="readiness-empty"><Check /> 暂无事项。</p>}</section>)}
    <details className="readiness-ready"><summary><span><Check /> 已准备好 · {readiness.counts.ready}</span><ChevronDown /></summary><div>{readiness.sections.ready.map(renderItem)}</div></details>
    <p className="readiness-local-note"><ShieldAlert /> 资料仅保存在本机，不包含在准备清单导出或 JSON 备份中。</p>
  </section>;
}
