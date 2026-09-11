'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { guideData } from '@/lib/data';
import { normalizeRouteCity, type Entity, type EntityType } from '@/lib/entity-library';
import { useDialogLifecycle } from '@/hooks/use-dialog-lifecycle';
import type { AddMode, CustomEntity } from '@/features/app/appModel';
import { routeCityForDay } from '@/features/trip/tripModel';
import type { Day } from '@/lib/types';
import { Media } from '@/views/shared/EntityUi';

export function QuickAdd({
  dayId,
  mode,
  close,
  entities,
  add,
  addCustom,
}: {
  dayId: number;
  mode: AddMode;
  close: () => void;
  entities: Entity[];
  add: (
    id: string,
    day: number,
    target: 'activeItems' | 'alternatives',
  ) => void;
  addCustom: (
    entity: CustomEntity,
    target: 'activeItems' | 'alternatives',
    duration: string,
  ) => void;
}) {
  const dialogRef = useDialogLifecycle<HTMLDialogElement>(close);
  const city = routeCityForDay(guideData.days[dayId - 1] as Day);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<'activeItems' | 'alternatives'>(
    'activeItems',
  );
  const [form, setForm] = useState({
    name: '',
    type: 'custom' as EntityType,
    address: '',
    google: '',
    xhs: '',
    notes: '',
    duration: '60min',
    image: '',
    price: '',
  });
  const types: EntityType[] =
    mode === 'food'
      ? ['restaurant', 'cafe']
      : mode === 'gym'
        ? ['gym']
        : ['place', 'shopping', 'photo_spot', 'activity'];
  const candidates = entities
    .filter(
      (entity) =>
        normalizeRouteCity(entity.city) === city &&
        types.includes(entity.type) &&
        `${entity.name}${entity.tags.join(' ')}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(a.raw.hotelPriority ?? 99) - Number(b.raw.hotelPriority ?? 99),
    );
  const submit = () => {
    if (!form.name.trim()) return;
    const id = `custom-${Date.now()}`;
    addCustom(
      {
        id,
        type: form.type,
        name: form.name.trim(),
        city,
        address: form.address || '待确认',
        mapQuery: form.google || form.name,
        coordinates: null,
        images: form.image
          ? [
              {
                file: form.image,
                role: 'cover',
                title: form.name,
                caption: form.name,
                source: null,
                sourcePage: null,
                lastVerified: null,
                isCover: true,
                priority: 1,
                status: 'user-provided',
              },
            ]
          : [],
        description: form.notes,
        priceLabel: form.price ? `¥${form.price}` : '待确认',
        projectedCostCny: form.price ? Number(form.price) : null,
        openingHours: '待确认',
        links: { source: form.google || undefined },
        source: '用户自定义',
        lastVerified: new Date().toISOString().slice(0, 10),
        tags: ['custom'],
        notes: form.xhs,
        raw: {},
      },
      target,
      form.duration,
    );
    close();
  };
  return (
    <div
      className="sheet-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <dialog open ref={dialogRef} className="quick-sheet" aria-modal="true">
        <header>
          <div>
            <span>QUICK ADD · DAY {dayId}</span>
            <h2>
              {mode === 'custom'
                ? '添加途中发现'
                : `添加${mode === 'food' ? '餐饮' : mode === 'gym' ? 'GYM' : '地点'}`}
            </h2>
          </div>
          <button onClick={close} aria-label="关闭">
            <X />
          </button>
        </header>
        <div className="target-toggle">
          <button
            className={target === 'activeItems' ? 'active' : ''}
            onClick={() => setTarget('activeItems')}
          >
            加入今天
          </button>
          <button
            className={target === 'alternatives' ? 'active' : ''}
            onClick={() => setTarget('alternatives')}
          >
            加入备选
          </button>
        </div>
        {mode === 'custom' ? (
          <div className="custom-form">
            <input
              placeholder="名称*"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as EntityType })
              }
            >
              <option value="custom">Custom</option>
              <option value="place">Place</option>
              <option value="restaurant">Food</option>
              <option value="cafe">Cafe</option>
              <option value="gym">Gym</option>
              <option value="shopping">Shopping</option>
              <option value="photo_spot">Photo Spot</option>
            </select>
            <input
              placeholder="地址"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <input
              placeholder="Google Maps链接或查询词"
              value={form.google}
              onChange={(e) => setForm({ ...form, google: e.target.value })}
            />
            <input
              placeholder="小红书链接或关键词"
              value={form.xhs}
              onChange={(e) => setForm({ ...form, xhs: e.target.value })}
            />
            <input
              placeholder="预计时长，如60min"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
            />
            <input
              type="number"
              placeholder="预计费用 CNY（可空）"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <input
              placeholder="图片URL（可空）"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
            />
            <textarea
              placeholder="备注"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <button className="primary-action" onClick={submit}>
              保存到 Day {dayId}
            </button>
          </div>
        ) : (
          <>
            <input
              className="entity-search"
              placeholder={`搜索${city}候选`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="quick-results">
              {candidates.map((entity) => (
                <article key={entity.id}>
                  <Media
                    images={entity.images}
                    entityId={entity.id}
                    name={entity.name}
                    open={() => {}}
                  />
                  <div>
                    <small>{entity.type}</small>
                    <h3>{entity.name}</h3>
                    <p>{entity.priceLabel}</p>
                  </div>
                  <button
                    onClick={() => {
                      add(entity.id, dayId, target);
                      close();
                    }}
                  >
                    加入
                  </button>
                </article>
              ))}
              {!candidates.length && <p>当前城市没有符合条件的已验证候选。</p>}
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
