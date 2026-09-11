'use client';

import { CalendarCheck, Check, Circle, CreditCard, TrainFront } from 'lucide-react';
import type { AppController } from '@/features/app/useAppController';
import type { PlanTab } from '@/features/app/appModel';
import { yuan } from '@/features/app/appModel';
import { guideData } from '@/lib/data';
import type { DeadlineItem, Task } from '@/lib/types';
import { checkinActionId, deadlineActionId, taskActionId } from '@/lib/action-queue';
import { realStays, transportSegments } from '@/features/trip/tripModel';
import { usePlanController } from '@/features/plan/usePlanController';

const tabs: Array<[PlanTab, string]> = [
  ['bookings', 'Bookings'],
  ['deadlines', 'Deadlines'],
  ['checkin', 'Check-in'],
  ['transport', 'Transport'],
  ['budget', 'Budget'],
  ['tasks', 'Tasks'],
];

export function MobilePlan({ controller }: { controller: AppController }) {
  const plan = usePlanController({
    bookingStatuses: controller.bookingStatuses,
    budgetState: controller.budgetState,
  });
  const deadlines = guideData.deadlines as DeadlineItem[];
  const tasks = guideData.tasks.items as Task[];
  return (
    <main className="mobile-plan" data-mobile-screen="plan">
      <header className="mobile-screen-heading">
        <span>PLAN</span>
        <h1>旅行总控</h1>
        <p>订单、截止时间和预算集中在这里，不打断 Today 的现场节奏。</p>
      </header>
      <div className="mobile-filter-row mobile-plan-tabs">
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

      {controller.planTab === 'bookings' && (
        <div className="mobile-control-list">
          {plan.bookings.map((booking) => (
            <article key={booking.id}>
              <CalendarCheck />
              <div>
                <span>{booking.date || 'DATE PENDING'}</span>
                <h2>{booking.title}</h2>
                <p>{booking.detail}</p>
              </div>
              <select
                aria-label={`${booking.title}状态`}
                value={booking.status}
                onChange={(event) =>
                  controller.setBookingStatuses({
                    ...controller.bookingStatuses,
                    [booking.id]: event.target.value,
                  })
                }
              >
                {['Pending', 'Confirmed', 'Booked', 'Paid', 'Completed'].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </article>
          ))}
        </div>
      )}

      {controller.planTab === 'deadlines' && (
        <div className="mobile-control-list">
          {deadlines.map((item) => {
            const id = deadlineActionId(item);
            const status = controller.actionStatuses[id] ?? item.status;
            return (
              <article key={item.id}>
                {status === 'Done' ? <Check /> : <Circle />}
                <div>
                  <span>{item.date} · {item.priority}</span>
                  <h2>{item.title}</h2>
                  <p>{item.action}</p>
                </div>
                <button
                  onClick={() =>
                    controller.setActionStatuses({
                      ...controller.actionStatuses,
                      [id]: status === 'Done' ? 'Waiting' : 'Done',
                    })
                  }
                >
                  {status === 'Done' ? 'Done' : 'Mark done'}
                </button>
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
              <article key={stay.id}>
                {status === 'Done' ? <Check /> : <CalendarCheck />}
                <div>
                  <span>{stay.city} · {stay.checkIn}</span>
                  <h2>{stay.hotelName}</h2>
                  <p>{stay.execution.onlineCheckIn.requirement}</p>
                </div>
                <button
                  onClick={() =>
                    controller.setActionStatuses({
                      ...controller.actionStatuses,
                      [id]: status === 'Done' ? 'Waiting' : 'Done',
                    })
                  }
                >
                  {status === 'Done' ? 'Done' : 'Complete'}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {controller.planTab === 'transport' && (
        <div className="mobile-control-list">
          {transportSegments.map((segment) => (
            <article key={segment.id}>
              <TrainFront />
              <div>
                <span>DAY {segment.day} · {segment.date}</span>
                <h2>{segment.route}</h2>
                <p>{segment.doorToDoor}</p>
              </div>
              <small>{controller.preferredTransport[segment.id] ?? 'Choose in desktop Plan'}</small>
            </article>
          ))}
        </div>
      )}

      {controller.planTab === 'budget' && (
        <section className="mobile-budget-card">
          <CreditCard />
          <span>PROJECTED TOTAL</span>
          <h2>{yuan(plan.projected)}</h2>
          <p>{plan.unknown} 项仍待确认 · 距硬上限 {yuan(plan.overUnder)}</p>
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
            return (
              <article key={task.id}>
                {status === 'Done' ? <Check /> : <Circle />}
                <div>
                  <span>{task.group} · {task.due}</span>
                  <h2>{task.title}</h2>
                  <p>{task.note}</p>
                </div>
                <button
                  onClick={() =>
                    controller.setActionStatuses({
                      ...controller.actionStatuses,
                      [id]: status === 'Done' ? 'Waiting' : 'Done',
                    })
                  }
                >
                  {status === 'Done' ? 'Done' : 'Mark done'}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
