import { guideData } from '@/lib/data';
import type { Entity } from '@/lib/entity-library';
import type { Booking, DayRoute } from '@/lib/types';
import type { PlanDay, PlanItem } from '@/features/trip/planModel';
import { ticketBookingByEntity } from '@/features/trip/tripModel';
import {
  derivePlanDisplayStatusFromInput,
  isMealName,
  supportingPlanLabel,
  type PlanDisplayStatus,
} from '@/features/trip/planStatusModel';
export type { PlanDisplayStatus } from '@/features/trip/planStatusModel';

export type PlanPresentationRow = {
  item: PlanItem;
  entity: Entity;
  status: PlanDisplayStatus;
  supportingLabel: string;
};

export type TodaysTip = {
  id: string;
  kind: 'fixed' | 'booking' | 'arrival' | 'walking' | 'flex' | 'meal' | 'route';
  text: string;
};

function bookingForEntity(entityId: string) {
  const bookingId = ticketBookingByEntity[entityId];
  if (!bookingId) return undefined;
  return (guideData.bookings.items as Booking[]).find((booking) => booking.id === bookingId);
}

function effectiveTicketState(
  item: PlanItem,
  entity: Entity,
  bookingStatuses: Record<string, string>,
) {
  const booking = bookingForEntity(entity.id);
  return booking ? (bookingStatuses[booking.id] ?? booking.status) : item.ticket;
}

export function derivePlanDisplayStatus(
  item: PlanItem,
  entity: Entity,
  bookingStatuses: Record<string, string>,
): PlanDisplayStatus {
  const booking = bookingForEntity(entity.id);
  const ticketState = effectiveTicketState(item, entity, bookingStatuses);
  const context = [entity.name, entity.description, entity.notes, item.notes, item.guard, item.ticket]
    .filter(Boolean)
    .join(' ');
  return derivePlanDisplayStatusFromInput({
    ticketState,
    itemTicket: item.ticket,
    entityType: entity.type,
    context,
    hasBooking: Boolean(booking),
    paymentStatus: booking?.paymentStatus,
  });
}

export function buildPlanPresentation(
  planDay: PlanDay,
  resolve: (id: string) => Entity | undefined,
  bookingStatuses: Record<string, string>,
): PlanPresentationRow[] {
  return planDay.activeItems.flatMap((item) => {
    const entity = resolve(item.entityId);
    if (!entity) return [];
    const status = derivePlanDisplayStatus(item, entity, bookingStatuses);
    return [{
      item,
      entity,
      status,
      supportingLabel: supportingPlanLabel(status, item.ticket, entity.type, entity.name),
    }];
  });
}

export function countPlanStatuses(rows: PlanPresentationRow[]) {
  return rows.reduce<Record<PlanDisplayStatus, number>>(
    (counts, row) => ({ ...counts, [row.status]: counts[row.status] + 1 }),
    { fixed: 0, 'to-book': 0, core: 0, flex: 0 },
  );
}

function hasUnknownLeg(route: DayRoute) {
  return route.legs.some((leg) => {
    const missingDuration = leg.recommendedMode === 'Walk'
      ? leg.walkMin == null
      : leg.recommendedMode === 'Taxi'
        ? !leg.taxiTime
        : leg.transitMin == null;
    return missingDuration || /待确认|核实/.test(`${leg.status} ${leg.recommended}`);
  });
}

export function buildTodaysTips(rows: PlanPresentationRow[], route: DayRoute): TodaysTip[] {
  const tips: TodaysTip[] = [];
  const fixed = rows.find((row) => row.status === 'fixed');
  const toBook = rows.find((row) => row.status === 'to-book');
  const flex = rows.find((row) => row.status === 'flex');
  const meal = rows.find((row) => isMealName(row.entity.name));

  if (fixed) tips.push({
    id: `fixed-${fixed.item.id}`,
    kind: 'fixed',
    text: `${fixed.entity.name}为固定安排，请按确认时间执行`,
  });
  if (toBook) {
    tips.push({
      id: `book-${toBook.item.id}`,
      kind: 'booking',
      text: `${toBook.entity.name}仍需预约，请尽早锁定时段`,
    });
    if (/^\d{1,2}:\d{2}$/.test(toBook.item.time)) tips.push({
      id: `arrival-${toBook.item.id}`,
      kind: 'arrival',
      text: `${toBook.entity.name}请预留入口安检与报到时间`,
    });
  }
  if (meal) tips.push({
    id: `meal-${meal.item.id}`,
    kind: 'meal',
    text: `${meal.entity.name}是恢复时段，不建议过度压缩`,
  });
  if (flex) tips.push({
    id: `flex-${flex.item.id}`,
    kind: 'flex',
    text: `${flex.entity.name}为弹性安排，可按体力或天气调整`,
  });
  if (route.summary.walkingKm != null && route.summary.walkingKm >= 3) tips.push({
    id: 'walking',
    kind: 'walking',
    text: `今日已知步行约 ${route.summary.walkingKm} 公里，建议穿舒适的鞋`,
  });
  if (hasUnknownLeg(route)) tips.push({
    id: 'route',
    kind: 'route',
    text: '未核实路段请在出发前打开导航确认',
  });

  if (tips.length < 3) tips.push({
    id: 'buffer',
    kind: 'arrival',
    text: '安排之间保留机动时间，避免连续赶场',
  });
  return tips.slice(0, 5);
}
