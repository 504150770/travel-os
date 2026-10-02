import type { BackupPayload } from './appModel';

type Row = Record<string, unknown>;
const record = (value: unknown): value is Row => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const safeKeys = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.every(safeKeys);
  return !record(value) || Object.entries(value).every(([key, item]) =>
    !['__proto__', 'prototype', 'constructor'].includes(key) && safeKeys(item));
};
const mapOf = (value: unknown, check: (item: unknown) => boolean) => record(value) && Object.values(value).every(check);
const uniqueIds = (rows: Row[]) => new Set(rows.map((row) => row.id)).size === rows.length;
function invalid(field: string): never { throw new Error(`备份中的${field}不完整或格式不正确，未覆盖当前数据。`); }

export function validateBackup(value: unknown, knownEntityIds?: ReadonlySet<string>): BackupPayload {
  if (!record(value) || ![3, 4, 5].includes(Number(value.version)) || typeof value.version !== 'number')
    throw new Error('仅支持有效的 V3 / V4 / V5 行程备份，未覆盖当前数据。');
  if (!safeKeys(value)) invalid('字段');
  if (!text(value.exportedAt) || !Number.isFinite(Date.parse(value.exportedAt))) invalid('导出日期');
  // Required fields follow the real historical export contracts. Only fields
  // introduced after the file's version may be absent without losing data.
  if (value.version === 3 && value.taskStatuses === undefined) invalid('任务状态');
  if (value.version >= 4 && (value.actionStatuses === undefined || value.preferredTransport === undefined)) invalid('行动状态或交通偏好');
  if (value.version === 5 && value.packingItems === undefined) invalid('行李清单');
  for (const field of ['bookingStatuses', 'actionStatuses', 'taskStatuses', 'preferredTransport', 'deadlineStatuses']) {
    if (value[field] === undefined && !['bookingStatuses'].includes(field)) continue;
    if (!mapOf(value[field], text)) invalid('状态');
  }
  if (!mapOf(value.actuals, finite) || !text(value.notes) || !mapOf(value.favorites, (item) => typeof item === 'boolean')) invalid('预算、备注或收藏');
  if (value.checkinCompleted !== undefined && !mapOf(value.checkinCompleted, (item) => typeof item === 'boolean')) invalid('入住状态');
  if (!Array.isArray(value.customEntities)) invalid('自定义项目');
  const customIds = new Set<string>();
  const entityTypes = ['place', 'restaurant', 'cafe', 'gym', 'hotel', 'shopping', 'photo_spot', 'activity', 'custom'];
  for (const entity of value.customEntities) {
    if (!record(entity) || !text(entity.id) || !entity.id || !text(entity.name) || !entity.name.trim() || !entityTypes.includes(String(entity.type))) invalid('自定义项目');
    if (customIds.has(entity.id) || knownEntityIds?.has(entity.id)) invalid('自定义项目编号');
    customIds.add(entity.id);
    for (const field of ['city', 'address', 'mapQuery', 'description', 'priceLabel', 'openingHours', 'source', 'lastVerified', 'notes']) if (!text(entity[field])) invalid('自定义项目');
    if (!record(entity.raw) || !record(entity.links) || !Array.isArray(entity.tags) || !entity.tags.every(text)) invalid('自定义项目');
    if (entity.projectedCostCny !== null && !finite(entity.projectedCostCny)) invalid('自定义项目费用');
    if (entity.coordinates !== null && (!record(entity.coordinates) || !finite(entity.coordinates.lat) || !finite(entity.coordinates.lng) || Math.abs(entity.coordinates.lat) > 90 || Math.abs(entity.coordinates.lng) > 180)) invalid('自定义项目坐标');
    if (!Array.isArray(entity.images) || !entity.images.every((image) => record(image) && ['file', 'role', 'title', 'caption'].every((field) => text(image[field])) && finite(image.priority) && typeof image.isCover === 'boolean')) invalid('自定义项目图片');
  }
  const plan = value.currentItinerary;
  if (!record(plan) || !Number.isInteger(plan.version) || !text(plan.originalPlanId) || !plan.originalPlanId || !Array.isArray(plan.days) || plan.days.length !== 18) invalid('18天行程');
  const dayIds = new Set<number>();
  for (const day of plan.days) {
    if (!record(day) || !finite(day.dayId) || !Number.isInteger(day.dayId) || day.dayId < 1 || day.dayId > 18 || dayIds.has(day.dayId)) invalid('旅行日');
    dayIds.add(day.dayId);
    const items: Row[] = [];
    for (const field of ['activeItems', 'alternatives', 'removedItems']) {
      if (field === 'removedItems' && day[field] === undefined) continue;
      const rows = day[field];
      if (!Array.isArray(rows)) invalid('当天安排');
      for (const item of rows) {
        if (!record(item) || !text(item.entityId) || !['id', 'time', 'duration', 'status', 'notes', 'guard', 'ticket'].every((key) => text(item[key])) || !item.id || !item.entityId || !finite(item.order) || !Number.isInteger(item.order) || item.order < 1) invalid('当天安排');
        if (knownEntityIds && !knownEntityIds.has(item.entityId) && !customIds.has(item.entityId)) invalid('地点引用');
        items.push(item);
      }
    }
    if (!uniqueIds(items)) invalid('当天安排编号');
  }
  if (value.packingItems !== undefined) {
    const categories = ['Documents', 'Money', 'Electronics', 'Clothing', 'Winter', 'Toiletries', 'Medicine / Emergency', 'Gym', 'Flight', 'Daily Bag'];
    if (!Array.isArray(value.packingItems) || !value.packingItems.every((item) => record(item) && text(item.id) && !!item.id && text(item.label) && categories.includes(String(item.category)) && typeof item.packed === 'boolean' && typeof item.critical === 'boolean' && (item.custom === undefined || typeof item.custom === 'boolean')) || !uniqueIds(value.packingItems)) invalid('行李清单');
  }
  return value as unknown as BackupPayload;
}

export function parseBackup(source: string, knownEntityIds?: ReadonlySet<string>): BackupPayload {
  let value: unknown;
  try { value = JSON.parse(source); } catch { throw new Error('无法读取这个 JSON 备份，未覆盖当前数据。'); }
  return validateBackup(value, knownEntityIds);
}

// Serialize and snapshot everything before writing; roll back if a write fails.
export function writeBackupStorage(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, values: Record<string, unknown>) {
  const entries = Object.entries(values).map(([key, value]) => [key, JSON.stringify(value)] as const);
  const previous = entries.map(([key]) => [key, storage.getItem(key)] as const);
  try {
    for (const [key, value] of entries) storage.setItem(key, value);
    if (entries.some(([key, value]) => storage.getItem(key) !== value)) throw new Error('Storage verification failed');
  }
  catch {
    try {
      for (const [key, value] of previous) { if (value === null) storage.removeItem(key); else storage.setItem(key, value); }
      if (previous.some(([key, value]) => storage.getItem(key) !== value)) throw new Error('Rollback verification failed');
    }
    catch { throw new Error('设备存储异常，部分本地数据可能未能恢复。请保留原备份，不要继续修改数据。'); }
    throw new Error('设备存储不足或不可用，已撤回本次导入。');
  }
}
