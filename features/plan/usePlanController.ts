import { guideData } from '@/lib/data';
import type { Booking, Task } from '@/lib/types';
import { canonicalBookings } from '@/lib/hotel-execution';
import { calculateBudget } from '@/lib/budget-calculator';
import { realStays } from '@/features/trip/tripModel';

export function usePlanController({ bookingStatuses, budgetState }: {
  bookingStatuses: Record<string, string>;
  budgetState: ReturnType<typeof calculateBudget>;
}) {
  const bookings = canonicalBookings(realStays, guideData.bookings.items as Booking[]).map((item) => ({
    ...item,
    status: bookingStatuses[item.id] ?? item.status,
  }));
  const tasks = guideData.tasks.items as Task[];
  const projected = budgetState.projected;
  const unknown = budgetState.unknown;
  const overUnder = budgetState.remaining;
  const needToSave = Math.max(0, -overUnder);
  return { bookings, tasks, projected, unknown, overUnder, needToSave };
}
