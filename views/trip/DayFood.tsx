'use client';

import { Utensils } from 'lucide-react';
import { guideData } from '@/lib/data';
import { normalizeRouteCity, type Entity } from '@/lib/entity-library';
import { useEditablePlan } from '@/hooks/use-editable-plan';
import type { DerivedDayState } from '@/lib/derive-current-day';
import type { LightboxImage } from '@/features/app/appModel';
import { hotelForCity, routeCityForDay } from '@/features/trip/tripModel';
import type { Day } from '@/lib/types';
import { EntityActions, Media } from '@/views/shared/EntityUi';

export function DayFood({
  dayId,
  dayState,
  entities,
  actions,
  open,
}: {
  dayId: number;
  dayState: DerivedDayState;
  entities: Entity[];
  actions: ReturnType<typeof useEditablePlan>;
  open: (image: LightboxImage) => void;
}) {
  const city = routeCityForDay(guideData.days[dayId - 1] as Day);
  const stay = hotelForCity(city);
  const activeIds = new Set(
    actions.plan.days[dayId - 1].activeItems.map((item) => item.entityId),
  );
  const items = entities
    .filter(
      (entity) =>
        ['restaurant', 'cafe'].includes(entity.type) &&
        normalizeRouteCity(entity.city) === city &&
        ((entity.raw.recommendedDays as number[] | undefined)?.includes(
          dayId,
        ) ??
          false),
    )
    .sort(
      (a, b) =>
        Number(!activeIds.has(a.id)) - Number(!activeIds.has(b.id)) ||
        Number(a.raw.hotelPriority ?? 99) - Number(b.raw.hotelPriority ?? 99),
    );
  if (!items.length) return null;
  const used = new Set<string>();
  const choose = (test: (entity: Entity) => boolean, fallback = true) => {
    const picked =
      items.find((entity) => !used.has(entity.id) && test(entity)) ??
      (fallback ? items.find((entity) => !used.has(entity.id)) : undefined);
    if (picked) used.add(picked.id);
    return picked ? [picked] : [];
  };
  const groups = [
    {
      label: 'BEST FOR TODAY',
      items: choose((entity) => Number(entity.raw.hotelPriority ?? 99) <= 2),
    },
    {
      label: 'A PROPER MEAL',
      items: choose((entity) =>
        ['Lunch', 'Dinner'].includes(String(entity.raw.category)),
      ),
    },
    {
      label: 'QUICK & EASY',
      items: choose((entity) =>
        ['Breakfast', 'Snack'].includes(String(entity.raw.category)),
      ),
    },
    {
      label: 'SOLO FRIENDLY',
      items: choose((entity) =>
        /solo|单人|counter|quick/i.test(
          `${entity.description} ${entity.notes}`,
        ),
      ),
    },
    {
      label: 'COFFEE & DESSERT',
      items: choose(
        (entity) =>
          entity.type === 'cafe' ||
          ['Cafe', 'Dessert'].includes(String(entity.raw.category)),
      ),
    },
  ].filter((group) => group.items.length);
  const compact = (entity: Entity, topPick = false) => (
    <article key={entity.id} className={topPick ? 'food-top-pick' : ''}>
      <Media
        images={entity.images}
        entityId={entity.id}
        name={entity.name}
        open={open}
      />
      <div>
        <small>
          {topPick ? 'ROUTE PICK' : 'ANOTHER OPTION'} · {entity.priceLabel}
        </small>
        <h3>{entity.name}</h3>
        <dl className="food-facts">
          <div>
            <dt>代表菜</dt>
            <dd>{entity.description}</dd>
          </div>
          <div>
            <dt>预约</dt>
            <dd>{entity.notes || '待确认'}</dd>
          </div>
          <div>
            <dt>营业</dt>
            <dd>{entity.openingHours}</dd>
          </div>
          <div>
            <dt>主线距离</dt>
            <dd>
              {activeIds.has(entity.id)
                ? '已加入 Current Plan'
                : `围绕 ${dayState.routeContext} · 具体路线待导航确认`}
            </dd>
          </div>
        </dl>
        {entity.hotelAnchor && (
          <small className="hotel-anchor-note">
            离酒店：点击 From Hotel 获取实时路线 · 基点{' '}
            {entity.hotelAnchor.name}
          </small>
        )}
        <EntityActions
          entity={entity}
          selectedDay={dayId}
          addEntity={actions.addEntity}
          placement={actions.placement}
        />
      </div>
    </article>
  );
  return (
    <section id="day-food" className="section-card day-food">
      <div className="section-title">
        <div>
          <span>FOOD · CHOOSE DIRECT</span>
          <h2>今天吃什么</h2>
          {stay && <p>住宿基点：{stay.hotelName}</p>}
          <p className="route-context-note">
            今天顺路 · {dayState.routeContext}
          </p>
        </div>
        <Utensils />
      </div>
      {stay?.execution.breakfastIncluded ? (
        <p className="breakfast-hotel">BREAKFAST AT HOTEL</p>
      ) : (
        <p className="verification-note">
          早餐未包含：优先酒店附近或当天第一站顺路咖啡。
        </p>
      )}
      <div className="food-choice-grid">
        {groups.map((group) => (
          <div className="meal-group" key={group.label}>
            <h3>{group.label}</h3>
            {compact(group.items[0], true)}
          </div>
        ))}
      </div>
    </section>
  );
}
