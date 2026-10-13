'use client';

import Image from 'next/image';
import {
  BedDouble,
  ChevronRight,
  Clock3,
  Dumbbell,
  MapPin,
  MoreHorizontal,
  Navigation,
  Route,
  TicketCheck,
  Utensils,
} from 'lucide-react';
import { useMemo } from 'react';
import type { Entity } from '@/lib/entity-library';
import type { PlanItem } from '@/hooks/use-editable-plan';
import type { AppController } from '@/features/app/useAppController';
import type { ReturnTypeUseTripController } from '@/features/mobile/mobileTypes';
import { deriveGymFit } from '@/lib/derive-current-day';
import { mapLinks, routeCityForDay } from '@/features/trip/tripModel';
import { selectCoverImage } from '@/lib/media';
import type { WeatherContextState } from '@/features/weather/useWeatherContext';
import { WeatherChip } from '@/components/weather/WeatherChip';
import { actionForDay } from '@/features/readiness/readinessModel';
import {
  buildPlanPresentation,
  buildTodaysTips,
  countPlanStatuses,
} from '@/features/trip/tripPresentationModel';
import {
  DayStatusSummary,
  StatusBadge,
} from '@/components/trip/TripStatusBadge';
import { TodaysTipsCard } from '@/views/trip/TodaysTipsCard';

export type ActionSelection = {
  item: PlanItem;
  entity: Entity;
  index: number;
  total: number;
};

function legLabel(
  leg: ReturnTypeUseTripController['currentRoute']['legs'][number],
) {
  if (leg.recommendedMode === 'Walk') {
    return leg.walkMin == null
      ? '步行 · 出发前核实'
      : `步行 ${leg.walkMin} 分钟`;
  }
  if (leg.recommendedMode === 'Taxi') return `出租车 · ${leg.taxiTime}`;
  return leg.transitMin == null
    ? '公共交通 · 出发前核实'
    : `公共交通 ${leg.transitMin} 分钟`;
}

export function MobileToday({
  controller,
  trip,
  food,
  gym,
  openEntity,
  openHotel,
  openActions,
  openDayPicker,
  weather,
  nextStopDistance,
}: {
  controller: AppController;
  trip: ReturnTypeUseTripController;
  food: Entity[];
  gym?: Entity;
  openEntity: (entity: Entity) => void;
  openHotel: () => void;
  openActions: (selection: ActionSelection) => void;
  openDayPicker: () => void;
  weather: WeatherContextState;
  nextStopDistance?: string;
}) {
  const { day, planDay, stay, dayState, currentRoute } = trip;
  const rows = useMemo(
    () =>
      buildPlanPresentation(
        planDay,
        controller.resolve,
        controller.bookingStatuses,
      ),
    [controller.bookingStatuses, controller.resolve, planDay],
  );
  const statusCounts = useMemo(() => countPlanStatuses(rows), [rows]);
  const tips = useMemo(
    () => buildTodaysTips(rows, currentRoute),
    [currentRoute, rows],
  );
  const next =
    rows.find(({ entity }) => !['hotel', 'activity'].includes(entity.type)) ??
    rows[0];
  const firstLeg = currentRoute.legs.find(
    (leg) => leg.toId === next?.entity.id,
  );
  const nextCover = next ? selectCoverImage(next.entity.images) : undefined;
  const nextLink = next ? mapLinks(next.entity).google : '#';
  const city = routeCityForDay(day);
  const gymFit = gym ? deriveGymFit(day, dayState) : null;
  const dayAction = actionForDay(controller.actionQueue, day.date);
  const hasNextPlanDay = Boolean(controller.actions.plan.days[day.day]);
  const removedItems = planDay.removedItems ?? [];
  const returnLeg = currentRoute.legs.findLast(
    (leg) => leg.toId === currentRoute.hotelId,
  );
  const openPlan = (tab: 'transport' | 'bookings') => {
    controller.navigateMobile('plan');
    controller.selectMobilePlanTab(tab);
  };

  return (
    <main className="mobile-today" data-mobile-screen="today">
      <section className="mobile-day-intro">
        <div>
          <span>{city.toUpperCase()}</span>
          <h1>{day.theme}</h1>
          <p>
            Day {day.day} · {day.date.slice(5).replace('-', '/')}
          </p>
          <WeatherChip weather={weather} compact />
        </div>
        <button onClick={openDayPicker} aria-label="选择旅行日">
          D{day.day} <ChevronRight />
        </button>
      </section>

      <nav className="mobile-day-shortcuts" aria-label="当天常用入口">
        <button
          onClick={openHotel}
          disabled={!stay}
          aria-label={stay ? `酒店 · ${stay.hotelName}` : '当天无住宿'}
        >
          <BedDouble />
          <span>酒店</span>
        </button>
        <button onClick={() => openPlan('transport')}>
          <Route />
          <span>当天交通</span>
        </button>
        <button onClick={() => openPlan('bookings')}>
          <TicketCheck />
          <span>订单与票据</span>
        </button>
      </nav>

      {dayAction && (
        <button
          className="mobile-day-reminder"
          onClick={() => controller.openAction(dayAction)}
        >
          <MapPin />
          <span>
            <small>当天提醒</small>
            <b>{dayAction.title}</b>
          </span>
          <ChevronRight />
        </button>
      )}

      {next && (
        <section className="mobile-next-card">
          <div className="mobile-card-label">
            <span>
              {['hotel', 'activity'].includes(next.entity.type)
                ? '行程起点'
                : '今日首站'}
            </span>
            <Clock3 />
          </div>
          <div className="mobile-next-main">
            {nextCover && (
              <button
                onClick={() => openEntity(next.entity)}
                aria-label={`查看 ${next.entity.name}`}
              >
                <Image
                  unoptimized
                  src={nextCover.file}
                  alt={nextCover.title || next.entity.name}
                  fill
                  priority
                  sizes="104px"
                />
              </button>
            )}
            <div>
              <span>{next.item.time}</span>
              <h2>{next.entity.name}</h2>
              <p>{firstLeg ? legLabel(firstLeg) : next.item.duration}</p>
              {nextStopDistance && <small>{nextStopDistance} · 估算距离</small>}
              <small>{next.supportingLabel}</small>
            </div>
          </div>
          <a
            className="mobile-primary-action"
            href={nextLink}
            target="_blank"
            rel="noreferrer"
          >
            <Navigation /> 导航
          </a>
        </section>
      )}

      <section className="mobile-glance" aria-label="Today at a glance">
        <span>
          <b>离店</b> {currentRoute.atGlance.mustLeaveHotel}
        </span>
        <span>
          <b>{rows.length}</b> 项安排
        </span>
        <span>
          已知步行 <b>{currentRoute.summary.walkingKm ?? '—'}</b> km
        </span>
        <span>
          <b>返程</b> {currentRoute.atGlance.backHotel.replace('预计', '')}
        </span>
      </section>

      <section className="mobile-section mobile-current-plan">
        <header>
          <div>
            <span>当天行程</span>
            <h2>按这个顺序走</h2>
          </div>
          <TicketCheck />
        </header>
        <DayStatusSummary counts={statusCounts} language="zh" />
        <div className="mobile-day-timeline">
          {rows.map(({ item, entity, status, supportingLabel }, index) => {
            const cover = selectCoverImage(entity.images);
            const leg = currentRoute.legs.find(
              (segment) =>
                segment.toId === entity.id &&
                segment.toId !== currentRoute.hotelId,
            );
            return (
              <div key={item.id} className="mobile-timeline-step">
                {leg?.fromId === currentRoute.hotelId && stay && (
                  <button className="mobile-timeline-hotel" onClick={openHotel}>
                    <BedDouble />
                    <span>
                      <small>酒店出发</small>
                      <b>{stay.hotelName}</b>
                    </span>
                    <ChevronRight />
                  </button>
                )}
                {leg && <MobileRouteReference leg={leg} />}
                <article>
                  <time>{item.time}</time>
                  <button
                    className="mobile-plan-main"
                    onClick={() => openEntity(entity)}
                  >
                    {cover && (
                      <Image
                        unoptimized
                        src={cover.file}
                        alt={cover.title || entity.name}
                        width={62}
                        height={62}
                        loading="lazy"
                      />
                    )}
                    <span>
                      <span className="mobile-plan-title">
                        <b>{entity.name}</b>
                        <StatusBadge status={status} language="zh" />
                      </span>
                      <small>
                        {item.duration} · {supportingLabel}
                      </small>
                    </span>
                  </button>
                  <button
                    className="mobile-more-button"
                    onClick={() =>
                      openActions({ item, entity, index, total: rows.length })
                    }
                    aria-label={`${entity.name}更多操作`}
                  >
                    <MoreHorizontal />
                  </button>
                </article>
              </div>
            );
          })}
        </div>
        {returnLeg && stay && (
          <>
            <MobileRouteReference leg={returnLeg} />
            <button className="mobile-timeline-hotel" onClick={openHotel}>
              <BedDouble />
              <span>
                <small>返回酒店</small>
                <b>{stay.hotelName}</b>
              </span>
              <ChevronRight />
            </button>
          </>
        )}
        {rows.length === 0 && (
          <p className="mobile-day-empty">
            当天没有正式安排，可以查看下方备选或切换日期。
          </p>
        )}
      </section>

      <section
        className="mobile-section mobile-day-pools"
        aria-label="当天备选与已移除安排"
      >
        <details>
          <summary>
            当天备选 · {planDay.alternatives.length}
            <ChevronRight />
          </summary>
          {planDay.alternatives.length === 0 && <p>暂无备选安排。</p>}
          {planDay.alternatives.map((item) => {
            const entity = controller.resolve(item.entityId);
            return (
              entity && (
                <article key={item.id}>
                  <button
                    className="mobile-pool-name"
                    onClick={() => openEntity(entity)}
                  >
                    {entity.name}
                  </button>
                  <button
                    onClick={() =>
                      controller.actions.transfer(
                        day.day,
                        item.id,
                        'alternatives',
                        'activeItems',
                      )
                    }
                  >
                    加入 D{day.day}
                  </button>
                </article>
              )
            );
          })}
        </details>
        {removedItems.length > 0 && (
          <details>
            <summary>
              已移除 · {removedItems.length}
              <ChevronRight />
            </summary>
            {removedItems.map((item) => {
              const entity = controller.resolve(item.entityId);
              return (
                entity && (
                  <article key={item.id}>
                    <button
                      className="mobile-pool-name"
                      onClick={() => openEntity(entity)}
                    >
                      {entity.name}
                    </button>
                    <button
                      onClick={() =>
                        controller.actions.transfer(
                          day.day,
                          item.id,
                          'removedItems',
                          'alternatives',
                        )
                      }
                    >
                      恢复到备选
                    </button>
                  </article>
                )
              );
            })}
          </details>
        )}
      </section>

      {food.length > 0 && (
        <details className="mobile-section mobile-food-section mobile-optional-section">
          <summary>
            <Utensils />
            今天吃什么
            <ChevronRight />
          </summary>
          <header>
            <div>
              <span>沿途餐饮</span>
              <h2>今天吃什么</h2>
            </div>
            <Utensils />
          </header>
          <MobilePickCard
            entity={food[0]}
            label="当天推荐"
            openEntity={openEntity}
          />
          {food.length > 1 && (
            <div className="mobile-alternatives">
              {food.slice(1, 3).map((entity) => (
                <button key={entity.id} onClick={() => openEntity(entity)}>
                  <b>{entity.name}</b>
                  <span>{entity.priceLabel} · 沿途选择</span>
                  <ChevronRight />
                </button>
              ))}
            </div>
          )}
        </details>
      )}

      {gym && gymFit && (
        <details className="mobile-section mobile-gym-section mobile-optional-section">
          <summary>
            <Dumbbell />
            可选健身
            <ChevronRight />
          </summary>
          <header>
            <div>
              <span>当天健身</span>
              <h2>{gym.name}</h2>
            </div>
            <Dumbbell />
          </header>
          <p className={`mobile-fit ${gymFit.level}`}>{gymFit.label}</p>
          <p>{String(gym.raw.distance)}</p>
          <small>
            {gym.priceLabel} · {String(gym.raw.time)}
          </small>
          <div className="mobile-inline-actions">
            <button onClick={() => openEntity(gym)}>查看健身房</button>
            <a href={mapLinks(gym).google} target="_blank" rel="noreferrer">
              导航
            </a>
          </div>
        </details>
      )}

      <TodaysTipsCard tips={tips} />

      {hasNextPlanDay && (
        <section className="mobile-section mobile-important-action">
          <header>
            <div>
              <span>明日安排</span>
              <h2>{currentRoute.atGlance.tomorrow.split('；待办：')[0]}</h2>
            </div>
            <MapPin />
          </header>
          <button onClick={() => controller.selectMobileDay(day.day + 1)}>
            查看 D{day.day + 1}
          </button>
        </section>
      )}
    </main>
  );
}

function MobileRouteReference({
  leg,
}: {
  leg: ReturnTypeUseTripController['currentRoute']['legs'][number];
}) {
  return (
    <details className="mobile-timeline-leg">
      <summary>
        <Route />
        <span>
          <small>路段参考 · {legLabel(leg)}</small>
          {leg.from} → {leg.to}
        </span>
        <ChevronRight />
      </summary>
      <p>{leg.recommended}</p>
    </details>
  );
}

function MobilePickCard({
  entity,
  label,
  openEntity,
}: {
  entity: Entity;
  label: string;
  openEntity: (entity: Entity) => void;
}) {
  const cover = selectCoverImage(entity.images);
  return (
    <article className="mobile-pick-card">
      {cover && (
        <button onClick={() => openEntity(entity)}>
          <Image
            unoptimized
            src={cover.file}
            alt={cover.title || entity.name}
            fill
            loading="lazy"
            sizes="calc(100vw - 40px)"
          />
        </button>
      )}
      <div>
        <span>{label}</span>
        <h3>{entity.name}</h3>
        <p>{entity.description}</p>
        <small>{entity.priceLabel} · 沿途选择</small>
      </div>
      <div className="mobile-inline-actions">
        <button onClick={() => openEntity(entity)}>查看详情</button>
        <a href={mapLinks(entity).google} target="_blank" rel="noreferrer">
          导航
        </a>
      </div>
    </article>
  );
}
