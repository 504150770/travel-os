export type PlanDisplayStatus = 'fixed' | 'to-book' | 'core' | 'flex';

const confirmedStates = new Set([
  'ticketed',
  'booked',
  'paid',
  'confirmed',
  'completed',
  'done',
]);

const bookingNeededPattern = /to book|research|waiting|pending|unverified|出签后|放票|需预约|需要预约|门票待确认|提前数日|提前购买|提前买/i;
const flexiblePattern = /flex|optional|可选|可取消|可跳过|弹性|按体力|视体力|看体力|天气.*决定|现场决定|不把.+设为必做/i;
const noBookingPattern = /无票|无需预约|现场即可|常规免费|不适用/i;
const mealPattern = /早餐|午餐|晚餐|用餐|咖啡|休息/;

export type PlanStatusInput = {
  ticketState: string;
  itemTicket: string;
  entityType: string;
  context: string;
  hasBooking: boolean;
  paymentStatus?: string;
};

export function derivePlanDisplayStatusFromInput(input: PlanStatusInput): PlanDisplayStatus {
  const normalizedTicket = input.ticketState.trim().toLowerCase();
  const normalizedPayment = input.paymentStatus?.trim().toLowerCase() ?? '';
  if (confirmedStates.has(normalizedTicket) || confirmedStates.has(normalizedPayment)) return 'fixed';
  if (input.entityType === 'gym' || flexiblePattern.test(input.context)) return 'flex';
  if (input.hasBooking && noBookingPattern.test(input.itemTicket)) return 'core';
  if (input.hasBooking && !noBookingPattern.test(input.itemTicket)) return 'to-book';
  if (bookingNeededPattern.test(`${input.ticketState} ${input.itemTicket}`)) return 'to-book';
  return 'core';
}

export function supportingPlanLabel(
  status: PlanDisplayStatus,
  itemTicket: string,
  entityType: string,
  entityName: string,
) {
  if (status === 'fixed') return '已确认';
  if (status === 'to-book') return '需预约';
  if (status === 'flex') return entityType === 'gym' ? '按体力安排' : '可调整';
  if (mealPattern.test(entityName)) return '恢复时段';
  if (/无票|常规免费/.test(itemTicket)) return '无需预约';
  if (/现场即可/.test(itemTicket)) return '现场即可';
  return '核心安排';
}

export const isMealName = (name: string) => mealPattern.test(name);

// Gallery grouping only: keep transport entities in the plan, not in sightseeing cards.
export const isSightseeingEntity = (entity: { type: string; raw: Record<string, unknown> }) =>
  entity.type === 'place' && entity.raw.type !== 'transport';
