'use client';

import { ArrowLeft, ArrowRight, Camera, Dumbbell, ImageIcon, MapPinned, Plus, RotateCcw, Utensils } from 'lucide-react';
import { guideData } from '@/lib/data';
import type { Entity } from '@/lib/entity-library';
import { useEditablePlan } from '@/hooks/use-editable-plan';
import { MiniRoute } from '@/components/mini-route';
import { TodayAtGlance } from '@/components/execution-cards';
import type { Day } from '@/lib/types';
import type { CustomEntity, LightboxImage } from '@/features/app/appModel';
import { yuan } from '@/features/app/appModel';
import { routeCityForDay, todayDay } from '@/features/trip/tripModel';
import { useTripController } from '@/features/trip/useTripController';
import { AlternativePool, PlanStop } from '@/views/trip/CurrentPlan';
import { QuickAdd } from '@/views/trip/QuickAdd';
import { DayFood } from '@/views/trip/DayFood';
import { DayGym, GymDetailModal } from '@/views/trip/DayGym';
import { TonightStay, TravelDayCard } from '@/views/trip/TripSupport';
import { TripDayHero } from '@/views/trip/TripDayHero';

export function TripView({
  selectedDay,
  setSelectedDay,
  resolve,
  entities,
  actions,
  open,
  clock,
  addCustom,
  preferredTransport,
  tomorrowAction,
  bookingStatuses,
  actionStatuses,
  privateLinks,
}: {
  selectedDay: number;
  setSelectedDay: (d: number) => void;
  resolve: (id: string) => Entity | undefined;
  entities: Entity[];
  actions: ReturnType<typeof useEditablePlan>;
  open: (image: LightboxImage) => void;
  clock: Date | null;
  addCustom: (
    entity: CustomEntity,
    target: 'activeItems' | 'alternatives',
    duration: string,
  ) => void;
  preferredTransport: Record<string, string>;
  tomorrowAction?: string;
  bookingStatuses: Record<string, string>;
  actionStatuses: Record<string, string>;
  privateLinks: Record<string, string>;
}) {
  const {
    day, planDay, stay, dayState, currentRoute, quick, setQuick, quickMenu,
    setQuickMenu, selectedGym, setSelectedGym, tripTopRef, switcherRef, hero,
    optionalGyms, openQuick, changeDay,
  } = useTripController({ selectedDay, setSelectedDay, resolve, entities, actions, tomorrowAction });
  const quickButtons = (
    <>
      <button onClick={() => openQuick('place')}>
        <MapPinned />
        地点
      </button>
      <button onClick={() => openQuick('food')}>
        <Utensils />
        餐饮
      </button>
      <button onClick={() => openQuick('gym')}>
        <Dumbbell />
        健身房
      </button>
      <button onClick={() => openQuick('custom')}>
        <Plus />
        自定义
      </button>
    </>
  );
  return (
    <div className="v2-view trip-v2 editable-trip" ref={tripTopRef}>
      <div className="day-switcher" ref={switcherRef}>
        {guideData.days.map((item) => (
          <button
            key={item.day}
            aria-current={item.day === selectedDay ? 'date' : undefined}
            className={item.day === selectedDay ? 'active' : ''}
            onClick={() => changeDay(item.day)}
          >
            <b>D{item.day}</b>
            <span>{routeCityForDay(item as Day)}</span>
          </button>
        ))}
      </div>
      <div className="day-controls">
        <button
          disabled={selectedDay === 1}
          onClick={() => changeDay(selectedDay - 1)}
        >
          <ArrowLeft />
          上一天
        </button>
        <button onClick={() => changeDay(todayDay(clock ?? new Date()))}>
          回到今天 · D{todayDay(clock ?? new Date())}
        </button>
        <button
          disabled={selectedDay === 18}
          onClick={() => changeDay(selectedDay + 1)}
        >
          下一天
          <ArrowRight />
        </button>
        <button
          className="reset-trip"
          onClick={() =>
            window.confirm('恢复全部Original Plan？') && actions.resetTrip()
          }
        >
          <RotateCcw />
          重置行程
        </button>
      </div>
      <div key={selectedDay} className="trip-day-content">
        <TripDayHero day={day} hero={hero} />
        <TodayAtGlance day={day} route={currentRoute} />
        <nav className="day-anchor-nav" aria-label="当天页面导航">
          <a href="#day-route">路线</a>
          <a href="#day-plan">行程</a>
          <a href="#day-food">餐饮</a>
          <a href="#day-gym">健身</a>
          <a href="#day-backup">备选</a>
        </nav>
        <TravelDayCard
          dayId={selectedDay}
          preferredTransport={preferredTransport}
          actionStatuses={actionStatuses}
          privateLinks={privateLinks}
        />
        <div className="trip-layout">
          <main>
            <section id="day-route" className="section-card route-flow-section">
              <div className="section-title">
                <div>
                  <span>TODAY ROUTE</span>
                  <h2>今天按这个顺序走</h2>
                </div>
                <MapPinned />
              </div>
              <MiniRoute
                day={day}
                places={guideData.places}
                route={currentRoute}
                hotel={stay}
              />
            </section>
            <section id="day-plan" className="section-card today-plan">
              <div className="section-title">
                <div>
                  <span>TODAY PLAN</span>
                  <h2>详细时间轴</h2>
                </div>
                <Camera />
              </div>
              <div className="quick-add-inline">
                <span>QUICK ADD</span>
                {quickButtons}
              </div>
              <div className="stop-list">
                {planDay.activeItems.map((item, index) => {
                  const entity = resolve(item.entityId);
                  return (
                    entity && (
                      <PlanStop
                        key={item.id}
                        item={item}
                        entity={entity}
                        dayId={selectedDay}
                        index={index}
                        total={planDay.activeItems.length}
                        open={open}
                        actions={actions}
                        bookingStatuses={bookingStatuses}
                      />
                    )
                  );
                })}
                {!planDay.activeItems.length && (
                  <div className="empty-state">
                    <ImageIcon />
                    <h3>今天还没有安排</h3>
                    <button onClick={() => openQuick('place')}>
                      + 添加地点
                    </button>
                  </div>
                )}
              </div>
            </section>
            <DayFood
              dayId={selectedDay}
              dayState={dayState}
              entities={entities}
              actions={actions}
              open={open}
            />
            <DayGym
              day={day}
              dayState={dayState}
              gyms={optionalGyms}
              actions={actions}
              openDetail={setSelectedGym}
            />
            <AlternativePool
              dayId={selectedDay}
              items={planDay.alternatives.filter(
                (item) =>
                  !['restaurant', 'cafe', 'gym'].includes(
                    resolve(item.entityId)?.type ?? '',
                  ),
              )}
              removed={planDay.removedItems ?? []}
              resolve={resolve}
              actions={actions}
              open={open}
            />
          </main>
          <aside>
            <TonightStay day={day} />
            <section className="loss-panel">
              <span>RUNNING LATE?</span>
              <h2>晚了就删，不追进度</h2>
              <p>{day.lossCut}</p>
            </section>
            <section className="section-card day-money">
              <span>DAY BUDGET</span>
              <h2>{yuan(dayState.knownCostCny || day.dayBudget)}</h2>
              <p>
                {dayState.knownCostCny
                  ? `Current Plan 已知费用 · ${dayState.unknownCostCount}项待确认`
                  : day.budgetLabel}
              </p>
            </section>
          </aside>
        </div>
      </div>
      <button
        className="quick-add-fab"
        onClick={() => setQuickMenu(!quickMenu)}
        aria-expanded={quickMenu}
      >
        <Plus /> Quick Add
      </button>
      {quickMenu && <div className="quick-add-mobile-menu">{quickButtons}</div>}
      {quick && (
        <QuickAdd
          dayId={selectedDay}
          mode={quick}
          close={() => setQuick(null)}
          entities={entities}
          add={actions.addEntity}
          addCustom={addCustom}
        />
      )}
      {selectedGym && (
        <GymDetailModal
          entity={selectedGym}
          dayId={selectedDay}
          actions={actions}
          open={open}
          close={() => setSelectedGym(null)}
        />
      )}
    </div>
  );
}
