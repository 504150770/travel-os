'use client';

import { CalendarCheck, Check, ChevronDown, Circle, CreditCard } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef } from 'react';
import type { AppController } from '@/features/app/useAppController';
import type { PlanTab } from '@/features/app/appModel';
import { yuan } from '@/features/app/appModel';
import { guideData } from '@/lib/data';
import type { DeadlineItem, Task } from '@/lib/types';
import { checkinActionId, deadlineActionId, taskActionId } from '@/lib/action-queue';
import { realStays, transportSegments } from '@/features/trip/tripModel';
import { usePlanController } from '@/features/plan/usePlanController';
import { MobileTransportPanel } from '@/components/mobile/MobileTransportPanel';
import { bookingsForDate } from '@/components/mobile/mobileTransportModel';
import { bookingStatusEditable, bookingSyncedActionIds } from '@/features/plan/interactionModel';
import '@/components/mobile/mobile-plan.css';

const tabs: Array<[PlanTab, string]> = [
  ['readiness', '出发准备'],
  ['bookings', '订单'],
  ['deadlines', '关键日期'],
  ['checkin', '在线入住'],
  ['transport', '交通'],
  ['budget', '预算'],
  ['tasks', '待办'],
];

const checkinRequirementLabels: Record<string, string> = {
  Unknown: '状态未确认',
  Required: '需要在线入住',
  'Not Required': '无需在线入住',
  Recommended: '建议在线入住',
};

const deadlinePriorityLabels: Record<string, string> = {
  Critical: '关键',
  Nice: '可选',
};

const ReadinessCenter = lazy(async () => ({ default: (await import('@/components/readiness/ReadinessCenter')).ReadinessCenter }));
const ContextualDocumentButton = lazy(async () => ({ default: (await import('@/components/documents/ContextualDocumentButton')).ContextualDocumentButton }));

export function MobilePlan({ controller }: { controller: AppController }) {
  const tabRow = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = tabRow.current;
    const active = row?.querySelector<HTMLButtonElement>('button.active');
    if (!row || !active) return;
    const rowBounds = row.getBoundingClientRect();
    const activeBounds = active.getBoundingClientRect();
    if (activeBounds.left < rowBounds.left) {
      row.scrollLeft += activeBounds.left - rowBounds.left - 12;
    } else if (activeBounds.right > rowBounds.right) {
      row.scrollLeft += activeBounds.right - rowBounds.right + 12;
    }
  }, [controller.planTab]);
  const plan = usePlanController({
    bookingStatuses: controller.bookingStatuses,
    budgetState: controller.budgetState,
  });
  const deadlines = guideData.deadlines as DeadlineItem[];
  const tasks = guideData.tasks.items as Task[];
  const bookingSyncedIds = bookingSyncedActionIds(tasks, controller.bookingStatuses);
  const selectedDate = guideData.days[controller.selectedDay - 1]?.date ?? '';
  const dayBookings = bookingsForDate(plan.bookings, selectedDate, realStays, transportSegments);
  const bookingGroups = [
    { id: 'current', label: `Day ${controller.selectedDay} 相关`, bookings: dayBookings.current, open: true },
    { id: 'other', label: dayBookings.current.length ? '其他订单' : '全部订单', bookings: dayBookings.other, open: false },
  ];
  return (
    <main className="mobile-plan" data-mobile-screen="plan">
      <header className="mobile-screen-heading">
        <span>PLAN</span>
        <h1>从容准备，安心出发。</h1>
        <p>订单、交通和出发前待办，都在这里。</p>
      </header>
      <div ref={tabRow} className="mobile-filter-row mobile-plan-tabs">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className={controller.planTab === id ? 'active' : ''}
            onClick={() => controller.selectMobilePlanTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {controller.planTab === 'readiness' && <Suspense fallback={<p className="readiness-loading">正在整理准备事项…</p>}><ReadinessCenter controller={controller} compact /></Suspense>}

      {controller.planTab === 'bookings' && (
        <div className="mobile-booking-groups">
          <p className="mobile-transport-context">订单与票据 · {selectedDate}</p>
          {bookingGroups.filter((group) => group.bookings.length > 0).map((group) => <details
            key={`${controller.selectedDay}-${group.id}`}
            className="mobile-booking-group"
            open={group.open}
          >
            <summary>{group.label}<span>{group.bookings.length} 项 <ChevronDown /></span></summary>
            <div className="mobile-control-list mobile-booking-list">
          {group.bookings.map((booking) => (
            <article key={booking.id} data-booking-id={booking.id} tabIndex={-1}>
              <CalendarCheck />
              <div>
                <span>{booking.date || 'DATE PENDING'}</span>
                <h2>{booking.title}</h2>
                <p>{booking.detail}</p>
                <span className="mobile-booking-current-status">状态：{booking.status}</span>
              </div>
              <div className="mobile-booking-actions">
                <Suspense fallback={null}>
                  <ContextualDocumentButton bookingId={booking.id} onAdd={controller.openDocumentForBooking} />
                </Suspense>
                <details className="mobile-booking-detail">
                  <summary>订单详情 <ChevronDown /></summary>
                  <dl className="mobile-plan-facts">
                    <div><dt>订单号</dt><dd>{booking.orderNumber || '待确认'}</dd></div>
                    <div><dt>地址 / 站点</dt><dd>{booking.address || booking.stationAirport || '待确认'}</dd></div>
                    {booking.serviceNumber && <div><dt>班次</dt><dd>{booking.serviceNumber}</dd></div>}
                    <div><dt>行李</dt><dd>{booking.baggage || '待确认'}</dd></div>
                    <div><dt>取消期限</dt><dd>{booking.cancellationDeadline || '待确认'}</dd></div>
                    {booking.notes && <div><dt>备注</dt><dd>{booking.notes}</dd></div>}
                  </dl>
                </details>
                {bookingStatusEditable(booking.id, transportSegments) && <details className="mobile-booking-status">
                  <summary>修改状态 <ChevronDown /></summary>
                  <select
                    aria-label={`${booking.title}状态`}
                    value={booking.status}
                    onChange={(event) => {
                      if (!bookingStatusEditable(booking.id, transportSegments)) return;
                      controller.setBookingStatuses({
                        ...controller.bookingStatuses,
                        [booking.id]: event.target.value,
                      });
                    }}
                  >
                    {Array.from(new Set([...guideData.bookings.statuses, 'Pending', booking.status])).map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </details>}
              </div>
            </article>
          ))}
            </div>
          </details>)}
        </div>
      )}

      {controller.planTab === 'deadlines' && (
        <div className="mobile-control-list">
          {deadlines.map((item) => {
            const id = deadlineActionId(item);
            const status = controller.actionStatuses[id] ?? item.status;
            const synced = bookingSyncedIds.has(id);
            return (
              <article key={item.id} data-action-id={id} tabIndex={-1}>
                {status === 'Done' ? <Check /> : <Circle />}
                <div>
                  <span>{item.date} · {deadlinePriorityLabels[item.priority] ?? item.priority}</span>
                  <h2>{item.title}</h2>
                  <p>{item.action}</p>
                  {synced && <small className="mobile-action-status-note">由订单状态自动完成</small>}
                </div>
                {!synced && <button
                  onClick={() =>
                    controller.setActionStatuses({
                      ...controller.actionStatuses,
                      [id]: status === 'Done' ? 'Waiting' : 'Done',
                    })
                  }
                >
                  {status === 'Done' ? '已完成' : '标记完成'}
                </button>}
              </article>
            );
          })}
        </div>
      )}

      {controller.planTab === 'checkin' && (
        <div className="mobile-control-list">
          {realStays.map((stay) => {
            const id = checkinActionId(stay.id);
            const status = controller.actionStatuses[id] ?? stay.execution.onlineCheckIn.status;
            return (
              <article key={stay.id} data-action-id={id} tabIndex={-1}>
                {status === 'Done' ? <Check /> : <CalendarCheck />}
                <div>
                  <span>{stay.areaLabel ?? stay.city} · {stay.checkIn}</span>
                  <h2>{stay.hotelName}</h2>
                  <p>{checkinRequirementLabels[stay.execution.onlineCheckIn.requirement] ?? stay.execution.onlineCheckIn.requirement}</p>
                </div>
                <button
                  onClick={() =>
                    controller.setActionStatuses({
                      ...controller.actionStatuses,
                      [id]: status === 'Done' ? 'Waiting' : 'Done',
                    })
                  }
                >
                  {status === 'Done' ? '已完成' : '标记完成'}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {controller.planTab === 'transport' && <MobileTransportPanel controller={controller} />}

      {controller.planTab === 'budget' && (
        <section className="mobile-budget-card">
          <CreditCard />
          <span>预计总额</span>
          <h2>{yuan(plan.projected)}</h2>
          <p>{plan.unknown} 项仍待确认 · {plan.overUnder < 0 ? '超出上限' : '剩余额度'} {yuan(Math.abs(plan.overUnder))}</p>
          <div>
            {guideData.budget.categories.map((category) => (
              <p key={category.id}>
                <span>{category.name}</span>
                <b>{yuan(category.budget)}</b>
              </p>
            ))}
          </div>
        </section>
      )}

      {controller.planTab === 'tasks' && (
        <div className="mobile-control-list">
          {tasks.map((task) => {
            const id = taskActionId(task.id);
            const status = controller.actionStatuses[id] ?? task.status;
            const synced = bookingSyncedIds.has(id);
            return (
              <article key={task.id} data-action-id={id} tabIndex={-1}>
                {status === 'Done' ? <Check /> : <Circle />}
                <div>
                  <span>{task.group} · {task.due}</span>
                  <h2>{task.title}</h2>
                  <p>{task.note}</p>
                  {synced && <small className="mobile-action-status-note">由订单状态自动完成</small>}
                </div>
                {!synced && <button
                  onClick={() =>
                    controller.setActionStatuses({
                      ...controller.actionStatuses,
                      [id]: status === 'Done' ? 'Waiting' : 'Done',
                    })
                  }
                >
                  {status === 'Done' ? '已完成' : '标记完成'}
                </button>}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
