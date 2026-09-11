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

export type ActionSelection = {
  item: PlanItem;
  entity: Entity;
  index: number;
  total: number;
};

function legLabel(leg: ReturnTypeUseTripController['currentRoute']['legs'][number]) {
  if (leg.recommendedMode === 'Walk') {
    return leg.walkMin == null ? 'Walk · check route' : `${leg.walkMin} min walk`;
  }
  if (leg.recommendedMode === 'Taxi') return `Taxi · ${leg.taxiTime}`;
  return leg.transitMin == null ? 'Transit · check route' : `${leg.transitMin} min transit`;
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
  const rows = planDay.activeItems.flatMap((item) => {
    const entity = controller.resolve(item.entityId);
    return entity ? [{ item, entity }] : [];
  });
  const next = rows.find(({ entity }) => !['hotel', 'activity'].includes(entity.type)) ?? rows[0];
  const firstLeg = currentRoute.legs[0];
  const nextCover = next ? selectCoverImage(next.entity.images) : undefined;
  const nextLink = next ? mapLinks(next.entity).google : '#';
  const city = routeCityForDay(day);
  const gymFit = gym ? deriveGymFit(day, dayState) : null;
  const hotelLink = stay
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.execution.address)}`
    : '#';
  const dayAction = actionForDay(controller.actionQueue, day.date);

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

      {next && (
        <section className="mobile-next-card">
          <div className="mobile-card-label">
            <span>NEXT STOP</span>
            <Clock3 />
          </div>
          <div className="mobile-next-main">
            {nextCover && (
              <button onClick={() => openEntity(next.entity)} aria-label={`查看 ${next.entity.name}`}>
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
              {nextStopDistance && <small>{nextStopDistance} · approximate</small>}
              <small>{next.item.ticket}</small>
            </div>
          </div>
          <a className="mobile-primary-action" href={nextLink} target="_blank" rel="noreferrer">
            <Navigation /> Navigate
          </a>
        </section>
      )}

      <section className="mobile-glance" aria-label="Today at a glance">
        <span>
          <b>Leave</b> {currentRoute.atGlance.mustLeaveHotel}
        </span>
        <span>
          <b>{rows.length}</b> Stops
        </span>
        <span>
          <b>{currentRoute.summary.walkingKm ?? '—'}</b> km
        </span>
        <span>
          <b>Back</b> {currentRoute.atGlance.backHotel.replace('预计', '')}
        </span>
      </section>

      <section className="mobile-section mobile-route-section">
        <header>
          <div>
            <span>TODAY ROUTE</span>
            <h2>按这个顺序走</h2>
          </div>
          <Route />
        </header>
        <div className="mobile-route-flow">
          <button className="mobile-route-node hotel" onClick={openHotel} disabled={!stay}>
            <i><BedDouble /></i>
            <span>
              <small>START</small>
              <b>{stay?.hotelName ?? currentRoute.atGlance.start}</b>
            </span>
          </button>
          {currentRoute.legs.map((leg, index) => {
            const entity = controller.resolve(leg.toId);
            const item = rows.find((row) => row.entity.id === leg.toId)?.item;
            const returning = leg.toId === currentRoute.hotelId;
            return (
              <div key={leg.id} className="mobile-route-step">
                <div className="mobile-route-leg">
                  <span />
                  <em>{legLabel(leg)}</em>
                </div>
                <button
                  className={`mobile-route-node ${returning ? 'hotel' : ''}`}
                  onClick={() => (returning ? openHotel() : entity && openEntity(entity))}
                >
                  <i>{returning ? <BedDouble /> : index + 1}</i>
                  <span>
                    <small>{returning ? 'RETURN' : item?.time ?? 'ARRIVE'}</small>
                    <b>{leg.to}</b>
                  </span>
                  <ChevronRight />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mobile-section mobile-current-plan">
        <header>
          <div>
            <span>CURRENT PLAN</span>
            <h2>今天的安排</h2>
          </div>
          <TicketCheck />
        </header>
        <div>
          {rows.map(({ item, entity }, index) => {
            const cover = selectCoverImage(entity.images);
            return (
              <article key={item.id}>
                <time>{item.time}</time>
                <button className="mobile-plan-main" onClick={() => openEntity(entity)}>
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
                    <b>{entity.name}</b>
                    <small>{item.duration} · {item.ticket}</small>
                  </span>
                </button>
                <button
                  className="mobile-more-button"
                  onClick={() => openActions({ item, entity, index, total: rows.length })}
                  aria-label={`${entity.name}更多操作`}
                >
                  <MoreHorizontal />
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {food.length > 0 && (
        <section className="mobile-section mobile-food-section">
          <header>
            <div>
              <span>EAT NEAR YOUR ROUTE</span>
              <h2>今天吃什么</h2>
            </div>
            <Utensils />
          </header>
          <MobilePickCard entity={food[0]} label="BEST FOR TODAY" openEntity={openEntity} />
          {food.length > 1 && (
            <div className="mobile-alternatives">
              {food.slice(1, 3).map((entity) => (
                <button key={entity.id} onClick={() => openEntity(entity)}>
                  <b>{entity.name}</b>
                  <span>{entity.priceLabel} · Route pick</span>
                  <ChevronRight />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {gym && gymFit && (
        <section className="mobile-section mobile-gym-section">
          <header>
            <div>
              <span>GYM TONIGHT</span>
              <h2>{gym.name}</h2>
            </div>
            <Dumbbell />
          </header>
          <p className={`mobile-fit ${gymFit.level}`}>{gymFit.label}</p>
          <p>{String(gym.raw.distance)}</p>
          <small>{gym.priceLabel} · {String(gym.raw.time)}</small>
          <div className="mobile-inline-actions">
            <button onClick={() => openEntity(gym)}>View Gym</button>
            <a href={mapLinks(gym).google} target="_blank" rel="noreferrer">Navigate</a>
          </div>
        </section>
      )}

      {stay && (
        <section className="mobile-section mobile-hotel-return">
          <header>
            <div>
              <span>BACK TO HOTEL</span>
              <h2>{stay.hotelName}</h2>
            </div>
            <BedDouble />
          </header>
          <p>{stay.execution.address}</p>
          <div className="mobile-inline-actions">
            <a href={hotelLink} target="_blank" rel="noreferrer">Navigate</a>
            <button onClick={openHotel}>Entrance & details</button>
          </div>
        </section>
      )}

      <section className="mobile-section mobile-important-action">
        <header>
          <div>
            <span>{dayAction ? 'TODAY ACTION' : 'TOMORROW'}</span>
            <h2>{dayAction?.title ?? currentRoute.atGlance.tomorrow}</h2>
          </div>
          <MapPin />
        </header>
        {dayAction && (
          <button onClick={() => { controller.navigateMobile('plan'); controller.selectMobilePlanTab(dayAction.target); }}>Open in Plan</button>
        )}
      </section>
    </main>
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
        <small>{entity.priceLabel} · Route pick</small>
      </div>
      <div className="mobile-inline-actions">
        <button onClick={() => openEntity(entity)}>View</button>
        <a href={mapLinks(entity).google} target="_blank" rel="noreferrer">Navigate</a>
      </div>
    </article>
  );
}
