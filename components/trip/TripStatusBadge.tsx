import type { PlanDisplayStatus } from '@/features/trip/tripPresentationModel';
import './trip-status.css';

const labels: Record<PlanDisplayStatus, string> = {
  fixed: 'Fixed',
  'to-book': 'To Book',
  core: 'Core',
  flex: 'Flex',
};
const chineseLabels: Record<PlanDisplayStatus, string> = {
  fixed: '固定',
  'to-book': '待预订',
  core: '主要',
  flex: '弹性',
};

export function StatusBadge({
  status,
  language = 'en',
}: {
  status: PlanDisplayStatus;
  language?: 'en' | 'zh';
}) {
  return (
    <span className="trip-status-badge" data-status={status}>
      {(language === 'zh' ? chineseLabels : labels)[status]}
    </span>
  );
}

export function DayStatusSummary({
  counts,
  language = 'en',
}: {
  counts: Record<PlanDisplayStatus, number>;
  language?: 'en' | 'zh';
}) {
  return (
    <div className="trip-status-summary" aria-label="当日状态汇总">
      {(Object.keys(labels) as PlanDisplayStatus[]).map(
        (status) =>
          counts[status] > 0 && (
            <span key={status}>
              <b>{counts[status]}</b>{' '}
              {(language === 'zh' ? chineseLabels : labels)[status]}
            </span>
          ),
      )}
    </div>
  );
}
