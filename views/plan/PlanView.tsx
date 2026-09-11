'use client';

import { Check, ChevronDown, ExternalLink } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { guideData } from '@/lib/data';
import type { DeadlineItem } from '@/lib/types';
import { taskActionId } from '@/lib/action-queue';
import { calculateBudget } from '@/lib/budget-calculator';
import { CheckinCenter, DeadlineCenter } from '@/components/execution-cards';
import type { PlanTab } from '@/features/app/appModel';
import { yuan } from '@/features/app/appModel';
import { realStays, transportSegments } from '@/features/trip/tripModel';
import { usePlanController } from '@/features/plan/usePlanController';
import type { AppController } from '@/features/app/useAppController';

const ReadinessCenter = lazy(async () => ({ default: (await import('@/components/readiness/ReadinessCenter')).ReadinessCenter }));
const ContextualDocumentButton = lazy(async () => ({ default: (await import('@/components/documents/ContextualDocumentButton')).ContextualDocumentButton }));

export function PlanView({
  controller,
  tab,
  setTab,
  bookingStatuses,
  setBookingStatuses,
  actionStatuses,
  setActionStatuses,
  actuals,
  setActuals,
  budgetState,
  preferredTransport,
  setPreferredTransport,
  privateLinks,
  setPrivateLinks,
}: {
  controller: AppController;
  tab: PlanTab;
  setTab: (t: PlanTab) => void;
  bookingStatuses: Record<string, string>;
  setBookingStatuses: (v: Record<string, string>) => void;
  actionStatuses: Record<string, string>;
  setActionStatuses: (v: Record<string, string>) => void;
  actuals: Record<string, number>;
  setActuals: (v: Record<string, number>) => void;
  budgetState: ReturnType<typeof calculateBudget>;
  preferredTransport: Record<string, string>;
  setPreferredTransport: (v: Record<string, string>) => void;
  privateLinks: Record<string, string>;
  setPrivateLinks: (v: Record<string, string>) => void;
}) {
  const { bookings, tasks, projected, unknown, overUnder, needToSave } = usePlanController({ bookingStatuses, budgetState });
  return (
    <div className="v2-view">
      <header className="v2-heading">
        <span>PLAN / CONTROL</span>
        <h1>订单、交通、任务与预算</h1>
        <p>真实酒店订单来自6份本地入住凭证；动态票价保留待核验状态。</p>
      </header>
      <div className="subnav">
        <button
          className={tab === 'readiness' ? 'active' : ''}
          onClick={() => setTab('readiness')}
        >
          READINESS
        </button>
        <button
          className={tab === 'bookings' ? 'active' : ''}
          onClick={() => setTab('bookings')}
        >
          BOOKINGS
        </button>
        <button
          className={tab === 'transport' ? 'active' : ''}
          onClick={() => setTab('transport')}
        >
          TRANSPORT
        </button>
        <button
          className={tab === 'checkin' ? 'active' : ''}
          onClick={() => setTab('checkin')}
        >
          CHECK-IN
        </button>
        <button
          className={tab === 'deadlines' ? 'active' : ''}
          onClick={() => setTab('deadlines')}
        >
          DEADLINES
        </button>
        <button
          className={tab === 'tasks' ? 'active' : ''}
          onClick={() => setTab('tasks')}
        >
          TASKS
        </button>
        <button
          className={tab === 'budget' ? 'active' : ''}
          onClick={() => setTab('budget')}
        >
          BUDGET
        </button>
      </div>
      {tab === 'readiness' && <Suspense fallback={<p className="readiness-loading">Checking trip readiness…</p>}><ReadinessCenter controller={controller} /></Suspense>}
      {tab === 'bookings' && (
        <>
          <section className="real-hotel-summary">
            <span>REAL HOTEL COMMITMENT</span>
            <b>{yuan(guideData.hotelBookings.summary.committedCnyApprox)}</b>
            <p>
              已支付 {yuan(guideData.hotelBookings.summary.paidOnlineCny)} ·
              到店税费约{' '}
              {yuan(guideData.hotelBookings.summary.payAtPropertyCnyApprox)} ·
              15晚固定承诺成本
            </p>
          </section>
          <div className="booking-v2">
            {bookings.map((item) => (
              <details key={item.id}>
                <summary>
                  <div>
                    <span>
                      {item.category} · {item.date}
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                  </div>
                  <b>{yuan(item.budget)}</b>
                  <select
                    value={bookingStatuses[item.id] ?? item.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      setBookingStatuses({
                        ...bookingStatuses,
                        [item.id]: e.target.value,
                      })
                    }
                  >
                    {guideData.bookings.statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                  <ChevronDown />
                </summary>
                <div className="booking-detail">
                  <p>
                    <b>订单号</b>
                    {item.orderNumber || '待确认'}
                  </p>
                  <p>
                    <b>取消线</b>
                    {item.cancellationDeadline || '待确认'}
                  </p>
                  <p>
                    <b>地址/站点</b>
                    {item.address || item.stationAirport || '待确认'}
                  </p>
                  <p>
                    <b>行李</b>
                    {item.baggage || '待确认'}
                  </p>
                  <p>
                    <b>凭证</b>
                    {item.attachmentName || '待上传'}
                  </p>
                  <p>
                    <b>备注</b>
                    {item.notes || '—'}
                  </p>
                  <Suspense fallback={null}><ContextualDocumentButton bookingId={item.id} /></Suspense>
                </div>
              </details>
            ))}
          </div>
        </>
      )}
      {tab === 'transport' && (
        <div className="transport-grid">
          {transportSegments.map((segment) => (
            <article key={segment.id}>
              <header>
                <span>
                  DAY {segment.day} · {segment.date} · CHECKED{' '}
                  {segment.checkedAt}
                </span>
                <h2>{segment.route}</h2>
                <p>{segment.doorToDoor}</p>
              </header>
              <p>{segment.recommendation}</p>
              {segment.airportComparison && (
                <div className="airport-comparison">
                  {segment.airportComparison.map((item) => (
                    <div key={item.airport}>
                      <b>
                        {item.airport} · SCORE {item.doorToDoorScore}
                      </b>
                      <span>{item.ground}</span>
                      <small>{item.decision}</small>
                    </div>
                  ))}
                </div>
              )}
              <div className="transport-candidates">
                {segment.candidates.map((candidate) => (
                  <div key={candidate.rank}>
                    <b>{candidate.rank}</b>
                    <span>
                      {candidate.operator ?? '运营方待确认'} ·{' '}
                      {candidate.service ?? '班次待确认'}
                    </span>
                    <dl>
                      <div>
                        <dt>TIME</dt>
                        <dd>
                          {candidate.departure ?? '待确认'} →{' '}
                          {candidate.arrival ?? '待确认'} ·{' '}
                          {candidate.arrivalDate}
                        </dd>
                      </div>
                      <div>
                        <dt>DURATION</dt>
                        <dd>
                          {candidate.duration} · {candidate.changes}次换乘
                        </dd>
                      </div>
                      <div>
                        <dt>FARE</dt>
                        <dd>
                          {candidate.priceCny == null
                            ? '目标日价格待确认'
                            : `${yuan(candidate.priceCny)} 基础含税`}{' '}
                          · {candidate.fareType}
                        </dd>
                      </div>
                      <div>
                        <dt>BAG</dt>
                        <dd>
                          23kg{' '}
                          {candidate.baggage23kg == null
                            ? '待确认'
                            : candidate.baggage23kg
                              ? '已含/铁路可带'
                              : '未含'}{' '}
                          · {candidate.carryOn}
                        </dd>
                      </div>
                      <div>
                        <dt>TRANSFER</dt>
                        <dd>
                          {candidate.transit ?? '直达'} · 航站楼
                          {candidate.terminalChange ?? '不适用'} ·{' '}
                          {candidate.selfTransfer
                            ? 'SELF-TRANSFER'
                            : '非自助转机'}
                        </dd>
                      </div>
                      <div>
                        <dt>CHANGE</dt>
                        <dd>
                          {candidate.refundability} · 改签费
                          {candidate.changeFee}
                        </dd>
                      </div>
                    </dl>
                    <i title={candidate.status}>
                      {candidate.status.includes('VERIFIED') ||
                      candidate.status.includes('CAPTURED')
                        ? '✓ 已核'
                        : '△ 出发前确认'}
                    </i>
                    <small>
                      班次号 {candidate.flightNo ?? '待确认'} · checked{' '}
                      {candidate.checkedAt}
                    </small>
                    <button
                      className={
                        preferredTransport[segment.id] === candidate.rank
                          ? 'preferred'
                          : ''
                      }
                      onClick={() =>
                        setPreferredTransport({
                          ...preferredTransport,
                          [segment.id]: candidate.rank,
                        })
                      }
                    >
                      {preferredTransport[segment.id] === candidate.rank
                        ? 'PREFERRED'
                        : 'Select as Preferred'}
                    </button>
                  </div>
                ))}
              </div>
              {segment.expectedReleaseWindow && (
                <p className="release-window">
                  RECHECK WINDOW · {segment.expectedReleaseWindow}
                </p>
              )}
              <footer>
                <span title={segment.status}>
                  △ 班次、票价和行李按出票页最终确认
                </span>
                <div>
                  <a href={segment.source} target="_blank" rel="noreferrer">
                    目标日查询 <ExternalLink />
                  </a>
                  <a
                    href={segment.routeSource}
                    target="_blank"
                    rel="noreferrer"
                  >
                    官方线路 <ExternalLink />
                  </a>
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
      {tab === 'checkin' && (
        <CheckinCenter
          stays={realStays}
          statuses={actionStatuses}
          setStatuses={setActionStatuses}
          privateLinks={privateLinks}
          setPrivateLinks={setPrivateLinks}
        />
      )}
      {tab === 'deadlines' && (
        <DeadlineCenter
          items={guideData.deadlines as DeadlineItem[]}
          statuses={actionStatuses}
          setStatuses={setActionStatuses}
        />
      )}
      {tab === 'tasks' && (
        <div className="task-v2">
          {tasks.map((task) => {
            const linked = task.linkedBookingId
              ? bookingStatuses[task.linkedBookingId]
              : undefined;
            const synced = Boolean(
              linked && task.autoCompleteWhen.includes(linked),
            );
            const actionId = taskActionId(task.id);
            const status = synced
              ? 'Done'
              : (actionStatuses[actionId] ?? task.status);
            return (
              <article key={task.id}>
                <button
                  onClick={() =>
                    setActionStatuses({
                      ...actionStatuses,
                      [actionId]: status === 'Done' ? 'Open' : 'Done',
                    })
                  }
                >
                  <Check />
                </button>
                <div>
                  <span>
                    {task.group} · {task.due}
                  </span>
                  <h3>{task.title}</h3>
                  <p>{task.note}</p>
                  {synced && <small>由Booking自动完成</small>}
                </div>
                <select
                  disabled={synced}
                  value={status}
                  onChange={(e) =>
                    setActionStatuses({
                      ...actionStatuses,
                      [actionId]: e.target.value,
                    })
                  }
                >
                  {[
                    'Open',
                    'Ready',
                    'Waiting',
                    'Required',
                    'Doing',
                    'Done',
                    'Skipped',
                  ].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </article>
            );
          })}
        </div>
      )}
      {tab === 'budget' && (
        <div>
          <div className="budget-summary">
            <div>
              <span>HARD CAP</span>
              <b>{yuan(guideData.budget.hardCap)}</b>
            </div>
            <div>
              <span>CURRENT COMMITTED</span>
              <b>{yuan(budgetState.committed)}</b>
            </div>
            <div>
              <span>PROJECTED</span>
              <b
                className={
                  projected > guideData.budget.hardCap ? 'over-budget' : ''
                }
              >
                {yuan(projected)}
              </b>
            </div>
            <div>
              <span>{overUnder < 0 ? 'OVER CAP' : 'REMAINING'}</span>
              <b className={overUnder < 0 ? 'over-budget' : ''}>
                {yuan(Math.abs(overUnder))}
              </b>
            </div>
          </div>
          <div className="budget-state-split">
            <span>COMMITTED {yuan(budgetState.committed)}</span>
            <span>PLANNED {yuan(budgetState.planned)}</span>
            <span>OPTIONAL {yuan(budgetState.optional)}</span>
            <span>RESERVE {yuan(budgetState.reserve)}</span>
          </div>
          <p className="budget-note">
            酒店 {yuan(guideData.budget.fixedCommitted.amount)} 为 FIXED
            COMMITTED COST，不纳入节省项。购物最低{' '}
            {yuan(guideData.budget.shoppingFloor)} 保留。{unknown} 个Current
            Trip项目缺少可靠人民币价格，未计入Projected。
          </p>
          <section className="recovery-plan">
            <span>BUDGET RECOVERY PLAN</span>
            <h2>目标节省 {yuan(needToSave)}</h2>
            <div>
              {guideData.budget.recoveryPlan.map((item) => (
                <article key={item.id}>
                  <b>{item.label}</b>
                  <strong>{yuan(item.targetSaving)}</strong>
                  <p>{item.action}</p>
                </article>
              ))}
            </div>
          </section>
          <div className="budget-lines">
            {guideData.budget.categories.map((item) => {
              const spent = Number(actuals[item.id] ?? 0);
              const remaining = item.budget - spent;
              return (
                <label key={item.id}>
                  <span>
                    {item.name}
                    {item.id === 'hotels' && <em>FIXED</em>}
                    {item.id === 'shopping' && <em>RESERVED</em>}
                  </span>
                  <strong>{yuan(item.budget)}</strong>
                  <input
                    type="number"
                    value={actuals[item.id] ?? ''}
                    placeholder="实际支出"
                    onChange={(e) =>
                      setActuals({
                        ...actuals,
                        [item.id]: Number(e.target.value),
                      })
                    }
                  />
                  <b className={remaining < 0 ? 'over-budget' : ''}>
                    剩余 {yuan(remaining)}
                  </b>
                  <small>{item.note}</small>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
