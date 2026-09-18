import type { PlanDisplayStatus } from '@/features/trip/tripPresentationModel';
import './trip-status.css';

const labels: Record<PlanDisplayStatus, string> = {
  fixed: 'Fixed',
  'to-book': 'To Book',
  core: 'Core',
  flex: 'Flex',
};

export function StatusBadge({ status }: { status: PlanDisplayStatus }) {
  return <span className="trip-status-badge" data-status={status}>{labels[status]}</span>;
}

export function DayStatusSummary({
  counts,
}: {
  counts: Record<PlanDisplayStatus, number>;
}) {
  return <div className="trip-status-summary" aria-label="当日状态汇总">
    {(Object.keys(labels) as PlanDisplayStatus[]).map((status) => counts[status] > 0 && (
      <span key={status}><b>{counts[status]}</b> {labels[status]}</span>
    ))}
  </div>;
}
