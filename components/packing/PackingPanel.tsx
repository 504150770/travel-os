'use client';

import { Check, Circle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { PackingCategory, PackingItem } from '@/features/packing/packingModel';
import { addPackingItem, PACKING_CATEGORIES, packingSummary, updatePackingItem } from '@/features/packing/packingModel';
import '@/components/readiness/readiness.css';

const categoryLabels: Record<PackingCategory, string> = {
  Documents: '证件与资料', Money: '钱款与支付', Electronics: '电子设备', Clothing: '衣物', Winter: '冬季用品',
  Toiletries: '洗漱用品', 'Medicine / Emergency': '药品与应急', Gym: '健身用品', Flight: '飞行用品', 'Daily Bag': '随身包',
};

export function PackingPanel({ items, setItems }: { items: PackingItem[]; setItems: (items: PackingItem[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<PackingCategory>('Documents');
  const [critical, setCritical] = useState(false);
  const summary = packingSummary(items);
  const edit = (item: PackingItem) => {
    const next = window.prompt('Item name', item.label)?.trim();
    if (next) setItems(updatePackingItem(items, item.id, { label: next }));
  };
  return <section className="packing-panel">
    <header className="readiness-summary compact">
      <div><span>行李清单</span><h2>{summary.packed} / {summary.total} 已收好</h2></div>
      <strong>{summary.criticalRemaining} 项重要物品待收</strong>
    </header>
    <button className="readiness-primary" onClick={() => setAdding(!adding)}><Plus /> 添加物品</button>
    {adding && <form className="packing-add" onSubmit={(event) => {
      event.preventDefault(); if (!label.trim()) return;
      setItems(addPackingItem(items, label, category, critical)); setLabel(''); setCritical(false); setAdding(false);
    }}>
      <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Packing item" required />
      <select value={category} onChange={(event) => setCategory(event.target.value as PackingCategory)}>{PACKING_CATEGORIES.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}</select>
      <label><input type="checkbox" checked={critical} onChange={(event) => setCritical(event.target.checked)} /> Critical</label>
      <button type="submit">Save item</button>
    </form>}
    {PACKING_CATEGORIES.map((group) => {
      const groupItems = items.filter((item) => item.category === group);
      if (!groupItems.length) return null;
      return <section className="packing-group" key={group}><h3>{categoryLabels[group]}</h3>{groupItems.map((item) => <article key={item.id} className={item.packed ? 'packed' : ''}>
        <button className="packing-check" aria-label={`${item.packed ? 'Uncheck' : 'Check'} ${item.label}`} onClick={() => setItems(updatePackingItem(items, item.id, { packed: !item.packed }))}>{item.packed ? <Check /> : <Circle />}</button>
        <span><b>{item.label}</b>{item.critical && <small>Critical</small>}</span>
        <button aria-label={`Edit ${item.label}`} onClick={() => edit(item)}><Pencil /></button>
        <button aria-label={`Delete ${item.label}`} onClick={() => setItems(items.filter((entry) => entry.id !== item.id))}><Trash2 /></button>
      </article>)}</section>;
    })}
  </section>;
}
