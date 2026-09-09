import type { DeadlineItem, HotelBooking, Task } from '@/lib/types';

export type ActionStatus =
  | 'Open'
  | 'Ready'
  | 'Waiting'
  | 'Required'
  | 'Doing'
  | 'Done'
  | 'Skipped';
export type ActionItem = {
  id: string;
  source: 'deadline' | 'task' | 'checkin';
  sourceId: string;
  title: string;
  detail: string;
  due: string;
  priority: 'Critical' | 'Nice';
  status: ActionStatus;
  target: 'deadlines' | 'tasks' | 'checkin';
  hotelId?: string;
};

export const normalizeActionStatus = (value?: string): ActionStatus => {
  if (value === 'To Do' || !value) return 'Open';
  return [
    'Open',
    'Ready',
    'Waiting',
    'Required',
    'Doing',
    'Done',
    'Skipped',
  ].includes(value)
    ? (value as ActionStatus)
    : 'Open';
};

export const checkinActionId = (hotelId: string) => `checkin:${hotelId}`;
export const deadlineActionId = (item: DeadlineItem) =>
  item.category === 'Online check-in' && item.hotelId
    ? checkinActionId(item.hotelId)
    : `deadline:${item.id}`;
const taskAliases: Record<string, string> = {
  'visa-appointment': 'deadline:visa-appointment',
  'monitor-flights': 'deadline:transport-international',
  'colosseum-release': 'deadline:ticket-colosseum',
  'final-72': 'deadline:final-72h',
};
export const taskActionId = (taskId: string) =>
  taskAliases[taskId] ?? `task:${taskId}`;

const isCompleteBooking = (value?: string) =>
  ['Booked', 'Paid', 'Confirmed', 'Completed'].includes(value ?? '');

const sortableDue = (value: string) => {
  const iso = value.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (iso) return iso;
  const short = value.match(/(\d{2})\/(\d{2})/);
  return short ? `2026-${short[1]}-${short[2]}` : '9999-12-31';
};

export function buildActionQueue({
  deadlines,
  tasks,
  stays,
  statuses,
  bookingStatuses,
}: {
  deadlines: DeadlineItem[];
  tasks: Task[];
  stays: HotelBooking[];
  statuses: Record<string, string>;
  bookingStatuses: Record<string, string>;
}) {
  const items: ActionItem[] = deadlines.map((item) => ({
    id: deadlineActionId(item),
    source: 'deadline',
    sourceId: item.id,
    title: item.title,
    detail: item.action,
    due: `${item.date} ${item.time}`,
    priority: item.priority,
    status: normalizeActionStatus(
      statuses[deadlineActionId(item)] ?? item.status,
    ),
    target: item.category === 'Online check-in' ? 'checkin' : 'deadlines',
    hotelId: item.hotelId,
  }));
  const deadlineHotels = new Set(
    deadlines
      .filter((item) => item.category === 'Online check-in')
      .map((item) => item.hotelId)
      .filter(Boolean),
  );
  for (const stay of stays) {
    if (
      deadlineHotels.has(stay.id) ||
      stay.execution.onlineCheckIn.requirement === 'Not Required'
    )
      continue;
    items.push({
      id: checkinActionId(stay.id),
      source: 'checkin',
      sourceId: stay.id,
      title: `${stay.hotelName} 在线入住确认`,
      detail: stay.execution.onlineCheckIn.note,
      due: stay.checkIn,
      priority:
        stay.execution.onlineCheckIn.requirement === 'Required'
          ? 'Critical'
          : 'Nice',
      status: normalizeActionStatus(
        statuses[checkinActionId(stay.id)] ??
          stay.execution.onlineCheckIn.status,
      ),
      target: 'checkin',
      hotelId: stay.id,
    });
  }
  for (const task of tasks) {
    const booking = task.linkedBookingId
      ? bookingStatuses[task.linkedBookingId]
      : undefined;
    const synced =
      isCompleteBooking(booking) && task.autoCompleteWhen.includes(booking!);
    items.push({
      id: taskActionId(task.id),
      source: 'task',
      sourceId: task.id,
      title: task.title,
      detail: task.note,
      due: task.due,
      priority: task.group === '现在' ? 'Critical' : 'Nice',
      status: synced
        ? 'Done'
        : normalizeActionStatus(statuses[taskActionId(task.id)] ?? task.status),
      target: 'tasks',
    });
  }
  const unique = new Map<string, ActionItem>();
  for (const item of items) {
    const existing = unique.get(item.id);
    if (!existing) unique.set(item.id, item);
    else {
      if (sortableDue(item.due) < sortableDue(existing.due))
        existing.due = item.due;
      if (item.status === 'Done') existing.status = 'Done';
    }
  }
  return [...unique.values()].sort((a, b) => {
    const complete = (value: ActionStatus) =>
      ['Done', 'Skipped'].includes(value) ? 1 : 0;
    return (
      complete(a.status) - complete(b.status) ||
      sortableDue(a.due).localeCompare(sortableDue(b.due)) ||
      Number(b.priority === 'Critical') - Number(a.priority === 'Critical') ||
      a.id.localeCompare(b.id)
    );
  });
}
