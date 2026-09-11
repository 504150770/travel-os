'use client';

import { Check, Circle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { PackingCategory, PackingItem } from '@/features/packing/packingModel';
import { addPackingItem, PACKING_CATEGORIES, packingSummary, updatePackingItem } from '@/features/packing/packingModel';
import '@/components/readiness/readiness.css';

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
      <div><span>EUROPE 18-DAY PACKING</span><h2>{summary.packed} / {summary.total} Packed</h2></div>
      <strong>{summary.criticalRemaining} Critical Remaining</strong>
    </header>
    <button className="readiness-primary" onClick={() => setAdding(!adding)}><Plus /> Add item</button>
    {adding && <form className="packing-add" onSubmit={(event) => {
      event.preventDefault(); if (!label.trim()) return;
      setItems(addPackingItem(items, label, category, critical)); setLabel(''); setCritical(false); setAdding(false);
    }}>
      <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Packing item" required />
      <select value={category} onChange={(event) => setCategory(event.target.value as PackingCategory)}>{PACKING_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select>
      <label><input type="checkbox" checked={critical} onChange={(event) => setCritical(event.target.checked)} /> Critical</label>
      <button type="submit">Save item</button>
    </form>}
    {PACKING_CATEGORIES.map((group) => {
      const groupItems = items.filter((item) => item.category === group);
      if (!groupItems.length) return null;
      return <section className="packing-group" key={group}><h3>{group}</h3>{groupItems.map((item) => <article key={item.id} className={item.packed ? 'packed' : ''}>
        <button className="packing-check" aria-label={`${item.packed ? 'Uncheck' : 'Check'} ${item.label}`} onClick={() => setItems(updatePackingItem(items, item.id, { packed: !item.packed }))}>{item.packed ? <Check /> : <Circle />}</button>
        <span><b>{item.label}</b>{item.critical && <small>Critical</small>}</span>
        <button aria-label={`Edit ${item.label}`} onClick={() => edit(item)}><Pencil /></button>
        <button aria-label={`Delete ${item.label}`} onClick={() => setItems(items.filter((entry) => entry.id !== item.id))}><Trash2 /></button>
      </article>)}</section>;
    })}
  </section>;
}

