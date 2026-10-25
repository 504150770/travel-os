'use client';

import { Check, Pencil, Plus, Search, ShieldCheck, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PackingCategory, PackingFilter, PackingItem, PackingPriority, PackingStatus } from '@/features/packing/packingModel';
import {
  addPackingItem, filterPackingItems, PACKING_CATEGORIES, PACKING_GUIDANCE,
  PACKING_PRIORITIES, PACKING_PRIORITY_LABELS, PACKING_STATUSES, PACKING_STATUS_LABELS,
  packingPriority, packingStatus, packingSummary, PREPARATION, updatePackingItem,
} from '@/features/packing/packingModel';
import '@/components/readiness/readiness.css';
import './packing.css';

const categoryLabels: Record<PackingCategory, string> = {
  Documents: '证件与资料', Money: '钱款与支付', Electronics: '电子配件', Clothing: '衣物与分层', Winter: '冬季用品',
  Toiletries: '洗护与洗衣', 'Medicine / Emergency': '个人药品与应急', Gym: '健身用品', Flight: '飞行用品',
  'Daily Bag': '随身包', Safety: '防盗小物', Luggage: '行李', Preparation: '出发前准备', Tickets: '票务核对',
};
const ticketLabels = { issued: '已出票', verify: '待核实出票', buy: '待购买' };
const filters: Array<[PackingFilter, string]> = [
  ['all', '全部'], ['remaining', '未完成'], ['to-buy', '待买'], ['owned', '已具备'],
  ['unreviewed', '待盘点'], ['optional', '可选'], ['packed', '已完成'],
];
const isTask = (item: PackingItem) => ['Preparation', 'Tickets', 'Documents'].includes(item.category);

export function PackingPanel({ items, setItems }: {
  items: PackingItem[]; setItems: (items: PackingItem[]) => boolean | void;
}) {
  const [filter, setFilter] = useState<PackingFilter>('all');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<PackingCategory | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<PackingPriority | 'all'>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const editorName = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const undoButton = useRef<HTMLButtonElement>(null);
  const itemElements = useRef(new Map<string, HTMLElement>());
  const focusTarget = useRef<string | null>(null);
  const setFocusTarget = (id: string | null) => { focusTarget.current = id; };
  useEffect(() => { if (editing) editorName.current?.focus(); }, [editing]);
  const [label, setLabel] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState<PackingCategory>('Clothing');
  const [status, setStatus] = useState<PackingStatus>('unreviewed');
  const [priority, setPriority] = useState<PackingPriority>('recommended');
  const [saveError, setSaveError] = useState(false);
  const [removals, setRemovals] = useState<Array<{ item: PackingItem; index: number }>>([]);
  const removed = removals.at(-1);
  useEffect(() => {
    if (!focusTarget.current || editing) return;
    const target = focusTarget.current === 'add' ? addButton.current : focusTarget.current === 'undo' ? undoButton.current : itemElements.current.get(focusTarget.current);
    (target ?? searchInput.current)?.focus();
    focusTarget.current = null;
  }, [editing, items, removals]);
  const [announcement, setAnnouncement] = useState('');
  const summary = packingSummary(items);
  const visible = filterPackingItems(items, filter, query, group, priorityFilter);
  const percent = summary.required ? Math.round(summary.requiredPacked / summary.required * 100) : 0;
  const commit = (next: PackingItem[], message = '已保存在此浏览器') => {
    const saved = setItems(next) !== false;
    setSaveError(!saved);
    if (saved) setAnnouncement(message);
    return saved;
  };
  const startEdit = (item?: PackingItem) => {
    setEditing(item?.id ?? 'new'); setLabel(item?.label ?? ''); setQuantity(item?.quantity ?? '');
    setCategory(item?.category ?? 'Clothing'); setPriority(item ? packingPriority(item) : 'recommended'); setStatus(item ? packingStatus(item) : 'unreviewed');
  };
  const editor = <form className="preparation-editor" onSubmit={(event) => {
    event.preventDefault(); if (!label.trim()) return;
    const next = editing === 'new' ? addPackingItem(items, label, category, priority === 'must', status, quantity, priority)
      : updatePackingItem(items, editing!, { label: label.trim(), quantity: quantity.trim(), category, critical: priority === 'must', priority, preparationStatus: status });
    if (commit(next)) {
      setFocusTarget(editing === 'new' ? next.find((entry) => !items.some((item) => item.id === entry.id))?.id ?? 'add' : editing);
      setEditing(null);
    }
  }}>
    <h3>{editing === 'new' ? '添加自己的物品或待办' : '编辑清单项'}</h3>
    <div className="preparation-fields">
      <label>名称<input ref={editorName} value={label} onChange={(event) => setLabel(event.target.value)} maxLength={110} placeholder="例如：备用眼镜" required /></label>
      <label>数量 / 安排<input value={quantity} onChange={(event) => setQuantity(event.target.value)} maxLength={80} placeholder="例如：1 副" /></label>
      <label>分组<select value={category} onChange={(event) => setCategory(event.target.value as PackingCategory)}>{PACKING_CATEGORIES.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}</select></label>
      <label>拥有 / 需求<select value={status} onChange={(event) => setStatus(event.target.value as PackingStatus)}>{PACKING_STATUSES.map((value) => <option key={value} value={value}>{PACKING_STATUS_LABELS[value]}</option>)}</select></label>
      <label>优先级<select value={priority} onChange={(event) => setPriority(event.target.value as PackingPriority)}>{PACKING_PRIORITIES.map((value) => <option key={value} value={value}>{PACKING_PRIORITY_LABELS[value]}</option>)}</select></label>
    </div>
    <p>只填写物品名称和数量。不要填写护照号、卡号、密码或票券二维码。</p>
    <div className="preparation-editor-actions"><button type="button" onClick={() => { setFocusTarget(editing === 'new' ? 'add' : editing); setEditing(null); }}>取消</button><button type="submit">保存</button></div>
  </form>;

  return <section className="packing-panel preparation-panel" aria-label="欧洲出行准备清单">
    <header className="preparation-heading">
      <div><span className="preparation-eyebrow">WINTER EUROPE · {PREPARATION.dates}</span><h2>{PREPARATION.title}</h2><p>{PREPARATION.route}</p></div>
      <button ref={addButton} className="readiness-primary" onClick={() => startEdit()}><Plus aria-hidden="true" /> 添加</button>
    </header>
    <div className="preparation-progress">
      <div><strong>{summary.requiredPacked}<span> / {summary.required} 已完成</span></strong><span>{summary.toBuy} 项待买 · {summary.criticalRemaining} 项重要待办</span></div>
      <progress value={summary.requiredPacked} max={summary.required || 1} aria-label="准备进度（不含可选项）" />
      <p>{percent}% · 可选项不计入进度。优先级、拥有状态与勾选分别保存；可选物品也可以已具备。</p>
    </div>
    <details className="preparation-guide-details"><summary>轻装准备 · 现有箱子、分层穿衣与防盗</summary><div className="preparation-guides">
      <div><b>先用现有的箱子</b><p>68.5 × 43 × 26 cm。先试装、称重，再按各航段票面核对；不默认换箱。</p></div>
      <div><b>18 天，分层轮换</b><p>数量含身上穿的。先确认两次洗烘安排与洗标，条件不足再调整余量，不带 18 套。</p></div>
      <div><b>小锁只锁箱体</b><p>已有锁就不买。不能保证防盗；贵重物品贴身，行李不堵通道、不妨碍乘客。</p></div>
    </div></details>
    <p className="preparation-local"><ShieldCheck aria-hidden="true" /> 进度仅保存在当前浏览器，不会跨设备自动同步。可在「更多 → 备份」导出 / 恢复。</p>
    {saveError && <p className="preparation-error" role="alert">本次修改未保存：浏览器存储不可用或已满。请先保留现有备份，再重试。</p>}
    <output className="preparation-sr" aria-live="polite">{announcement}</output>
    {removed && <output className="preparation-undo"><span>已移除「{removed.item.label}」{removals.length > 1 && <small>可依次撤销 {removals.length} 次删除</small>}</span><button ref={undoButton} onClick={() => {
      if (items.some((item) => item.id === removed.item.id)) { setRemovals((entries) => entries.slice(0, -1)); return; }
      const next = [...items]; next.splice(Math.min(removed.index, next.length), 0, removed.item);
      if (commit(next, '已撤销移除')) { setRemovals((entries) => entries.slice(0, -1)); setFocusTarget(removed.item.id); }
    }}><Undo2 aria-hidden="true" /> 撤销</button></output>}
    {editing === 'new' && editor}
    <div className="preparation-toolbar">
      <label className="preparation-search"><Search aria-hidden="true" /><input ref={searchInput} type="search" aria-label="搜索清单" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索物品、车票或准备事项" /></label>
      <label className="preparation-group-filter"><span className="preparation-sr">筛选分组</span><select aria-label="筛选分组" value={group} onChange={(event) => setGroup(event.target.value as PackingCategory | 'all')}><option value="all">全部分组</option>{PACKING_CATEGORIES.filter((value) => items.some((item) => item.category === value)).map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}</select></label>
      <label className="preparation-group-filter"><span className="preparation-sr">筛选优先级</span><select aria-label="筛选优先级" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as PackingPriority | 'all')}><option value="all">全部优先级</option>{PACKING_PRIORITIES.map((value) => <option key={value} value={value}>{PACKING_PRIORITY_LABELS[value]}</option>)}</select></label>
    </div>
    <div className="preparation-filters" aria-label="筛选清单状态">{filters.map(([value, title]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{title}<span>{filterPackingItems(items, value, '', 'all').length}</span></button>)}</div>
    <p className="preparation-result-count">显示 {visible.length} / {items.length} 项 · 按优先级、分组排列</p>
    {!visible.length && <div className="preparation-empty"><Check aria-hidden="true" /><p>{items.length ? '这个筛选下没有事项。' : '清单为空，可以添加自己的物品。'}</p>{items.length > 0 && <button onClick={() => { setFilter('all'); setQuery(''); setGroup('all'); setPriorityFilter('all'); }}>查看全部</button>}</div>}
    {PACKING_PRIORITIES.map((tier) => {
      const tierItems = visible.filter((item) => packingPriority(item) === tier);
      if (!tierItems.length) return null;
      return <section className={`preparation-tier ${tier}`} key={tier} aria-label={PACKING_PRIORITY_LABELS[tier]}>
      <header className="preparation-tier-heading"><div><span>{tier === 'must' ? '01' : tier === 'recommended' ? '02' : '03'}</span><h3>{PACKING_PRIORITY_LABELS[tier]}</h3></div><small>{tierItems.length} 项</small></header>
      {PACKING_CATEGORIES.map((value) => {
      const rows = tierItems.filter((item) => item.category === value);
      if (!rows.length) return null;
      return <section className="preparation-group" key={value} aria-label={categoryLabels[value]}>
        <header><h3>{categoryLabels[value]}</h3><span>{rows.filter((item) => item.packed).length} / {rows.length}</span></header>
        {value === 'Tickets' && <p className="preparation-ticket-note">2026 年票务核验快照 · {PREPARATION.updatedAt}。勾选代表完成核对，不修改订单。待核实出票不等于没买；重买前先查订单及银行入账。</p>}
        {rows.map((item) => {
          const guidance = item.custom ? undefined : PACKING_GUIDANCE.get(item.id);
          const ticket = guidance?.ticketStatus;
          return <div key={item.id}>
            <article ref={(element) => { if (element) itemElements.current.set(item.id, element); else itemElements.current.delete(item.id); }} className={`preparation-item ${item.packed ? 'is-ready' : ''}`} data-packing-id={item.id} tabIndex={-1}>
              <label className="preparation-check"><input type="checkbox" checked={item.packed} aria-label={`${isTask(item) ? '已完成' : '已打包'}：${item.label}`} onChange={(event) => commit(updatePackingItem(items, item.id, { packed: event.target.checked }))} /><span>{isTask(item) ? '完成' : '打包'}</span></label>
              <div className="preparation-item-body">
                <div className="preparation-item-title"><h4>{item.label}</h4>{item.critical && <span className="preparation-badge important">重要</span>}{ticket && <span className={`preparation-badge ${ticket}`}>{ticketLabels[ticket]}</span>}</div>
                {item.quantity && <span className="preparation-quantity">{item.quantity}</span>}
                {guidance?.note && <p>{guidance.note}</p>}
                {ticket && <details className="preparation-evidence"><summary>核验说明</summary><p>核验对象：{guidance.label}。{guidance.evidence}</p></details>}
              </div>
              <div className="preparation-item-controls">
                <select aria-label={`${item.label}：拥有或需求`} data-status={packingStatus(item)} value={packingStatus(item)} onChange={(event) => commit(updatePackingItem(items, item.id, { preparationStatus: event.target.value as PackingStatus }))}>{PACKING_STATUSES.map((state) => <option key={state} value={state}>{PACKING_STATUS_LABELS[state]}</option>)}</select>
                <button aria-label={`编辑 ${item.label}`} onClick={() => startEdit(item)}><Pencil aria-hidden="true" /></button>
                <button aria-label={`移除 ${item.label}`} onClick={() => {
                  if (commit(items.filter((entry) => entry.id !== item.id), `已移除 ${item.label}`)) { setRemovals((entries) => [...entries, { item, index: items.findIndex((entry) => entry.id === item.id) }]); setFocusTarget('undo'); if (editing === item.id) setEditing(null); }
                }}><Trash2 aria-hidden="true" /></button>
              </div>
            </article>
            {editing === item.id && editor}
          </div>;
        })}
      </section>;
    })}</section>;
    })}
    <details className="preparation-sources"><summary>准备依据与使用说明 · {PREPARATION.updatedAt}</summary><p>数量与优先级是此行建议，可自行修改，不是法律规定或全部购买要求。只确认现有箱子已具备，其余先盘点。票务快照来自订单页、官方邮件与既有票面交接；参考规则不能替代实际航司订单行李额。攻略只取旅行经验，不采纳推广购买建议。</p><ul>{PREPARATION.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul><p>清单只保存名称、数量、分类和勾选状态；不要录入护照号、卡号、密码或票券二维码。</p></details>
  </section>;
}
