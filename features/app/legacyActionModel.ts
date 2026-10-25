import { checkinActionId, deadlineActionId, taskActionId } from '@/lib/action-queue';
import type { DeadlineItem } from '@/lib/types';
import type { BackupPayload } from './appModel';

type ActionState = Pick<BackupPayload, 'actionStatuses' | 'taskStatuses' | 'deadlineStatuses' | 'checkinCompleted'>;

// A modern snapshot is authoritative, including an intentionally empty map.
// Legacy precedence matches the original device migration: tasks, deadlines,
// then explicit check-in completion (false means Waiting, never absence).
export function migrateLegacyActionStatuses(data: ActionState, deadlines: readonly DeadlineItem[]): Record<string, string> {
  if (data.actionStatuses !== undefined) return data.actionStatuses;

  const migrated: Record<string, string> = {};
  Object.entries(data.taskStatuses ?? {}).forEach(([id, status]) => {
    migrated[taskActionId(id)] = status;
  });
  deadlines.forEach((item) => {
    const status = data.deadlineStatuses?.[item.id];
    if (status) migrated[deadlineActionId(item)] = status;
  });
  Object.entries(data.checkinCompleted ?? {}).forEach(([id, done]) => {
    migrated[checkinActionId(id)] = done ? 'Done' : 'Waiting';
  });
  return migrated;
}
