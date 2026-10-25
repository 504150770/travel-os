import type { BackupPayload } from './appModel';

export type BackupSummaryRow = { label: string; count: number | null; mode: 'replace' | 'keep' };

// Describe field presence, not just the version: an explicit [] or {} clears
// that field, while a missing field in an older backup keeps the local value.
export function summarizeBackup(data: BackupPayload) {
  const rows: BackupSummaryRow[] = [
    { label: '旅行日', count: data.currentItinerary.days.length, mode: 'replace' },
    { label: '自定义行程项目', count: data.customEntities.length, mode: 'replace' },
    { label: '订单状态', count: Object.keys(data.bookingStatuses).length, mode: 'replace' },
    { label: '实际支出记录', count: Object.keys(data.actuals).length, mode: 'replace' },
    { label: '收藏记录', count: Object.keys(data.favorites).length, mode: 'replace' },
    { label: '出行清单', count: data.packingItems?.length ?? null, mode: data.packingItems === undefined ? 'keep' : 'replace' },
    { label: '交通偏好', count: data.preferredTransport === undefined ? null : Object.keys(data.preferredTransport).length, mode: data.preferredTransport === undefined ? 'keep' : 'replace' },
  ];
  return { version: data.version, exportedAt: data.exportedAt, rows };
}
