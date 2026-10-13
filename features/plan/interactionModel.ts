import type { Task } from '@/lib/types';
import { buildActionQueue, taskActionId } from '@/lib/action-queue';
import { mergeBookingActionStatuses } from '@/features/app/appModel';

// Reuse the existing pure transport model, including its original booking map.
// Both surfaces therefore use the same ticketed-transport write boundaries.
export {
  mobileBookingStatusEditable as bookingStatusEditable,
  transportPreferenceAllowed,
} from '@/components/mobile/mobileTransportModel';

export function bookingSyncedActionIds(tasks: Task[], bookingStatuses: Record<string, string>) {
  // Start manual tasks as open so only completion derived from bookings remains.
  const queue = buildActionQueue({
    deadlines: [],
    tasks,
    stays: [],
    statuses: Object.fromEntries(tasks.map((task) => [taskActionId(task.id), 'Open'])),
    bookingStatuses,
  });
  return new Set([
    ...Object.keys(mergeBookingActionStatuses({}, bookingStatuses)),
    ...queue.filter((item) => item.status === 'Done').map((item) => item.id),
  ]);
}
