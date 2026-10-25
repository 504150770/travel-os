import preparation from '../../data/preparation.json' with { type: 'json' };

export const PACKING_STORAGE_KEY = 'europe-guide-packing-v1';
export const PACKING_CATEGORIES = [
  'Clothing', 'Winter', 'Safety', 'Luggage', 'Electronics', 'Toiletries', 'Preparation', 'Tickets', 'Documents',
  'Money', 'Medicine / Emergency', 'Gym', 'Flight', 'Daily Bag',
] as const;
export const PACKING_STATUSES = ['unreviewed', 'owned', 'to-buy'] as const;
export const PACKING_PRIORITIES = ['must', 'recommended', 'optional'] as const;
export const PACKING_PRIORITY_LABELS = { must: '出发前必须解决', recommended: '建议准备', optional: '可选' } as const;
export const PACKING_STATUS_LABELS = {
  unreviewed: '待盘点', owned: '已具备', 'to-buy': '待买',
} as const;
export type PackingCategory = (typeof PACKING_CATEGORIES)[number];
export type PackingStatus = (typeof PACKING_STATUSES)[number];
export type PackingPriority = (typeof PACKING_PRIORITIES)[number];
export type PackingItem = {
  id: string; label: string; category: PackingCategory; packed: boolean; critical: boolean;
  custom?: boolean; preparationStatus?: PackingStatus | 'optional'; templateVersion?: 2; quantity?: string; priority?: PackingPriority;
};
export type PackingGuidance = {
  id: string; label: string; category: PackingCategory; note: string; quantity?: string;
  status?: PackingStatus; priority?: PackingPriority; critical?: boolean; legacyLabel?: string;
  ticketStatus?: 'issued' | 'verify' | 'buy'; evidence?: string;
};
export const PREPARATION = preparation;
export const PACKING_GUIDANCE = new Map<string, PackingGuidance>(
  (preparation.items as PackingGuidance[]).map((item) => [item.id, item]),
);
export const DEFAULT_PACKING_ITEMS: PackingItem[] = (preparation.items as PackingGuidance[]).map((item) => ({
  id: item.id, label: item.label, category: item.category, packed: false,
  critical: item.critical ?? false, preparationStatus: item.status ?? 'unreviewed', templateVersion: 2,
  priority: item.priority ?? 'recommended',
  ...(item.quantity ? { quantity: item.quantity } : {}),
}));

// Retain the original key and IDs. Append new template IDs once, without
// resurrecting deleted legacy items or replacing custom labels/checkmarks.
// Empty lists remain empty. This projection never writes on page load.
export function migratePackingItems(items: PackingItem[]): PackingItem[] {
  if (!items.length || items.every((item) => item.templateVersion === 2 && item.priority && item.preparationStatus !== 'optional')) return items;
  const alreadyUpgraded = items.some((item) => item.templateVersion === 2);
  const ids = new Set(items.map((item) => item.id));
  const migrated = items.map((item): PackingItem => {
    const preset = item.custom ? undefined : PACKING_GUIDANCE.get(item.id);
    return {
      ...item,
      label: preset && item.label === preset.legacyLabel ? preset.label : item.label,
      preparationStatus: item.preparationStatus === 'optional' ? 'unreviewed' : item.preparationStatus ?? preset?.status ?? 'unreviewed',
      priority: item.priority ?? (item.preparationStatus === 'optional' ? 'optional' : item.critical ? 'must' : preset?.priority ?? 'recommended'),
      quantity: item.quantity ?? preset?.quantity,
      templateVersion: 2,
    };
  });
  if (!alreadyUpgraded) migrated.push(...DEFAULT_PACKING_ITEMS.filter((item) =>
    !/^pack-\d{2}$/.test(item.id) && !ids.has(item.id)));
  return migrated;
}
export const packingStatus = (item: PackingItem): PackingStatus => item.preparationStatus === 'optional' ? 'unreviewed' : item.preparationStatus ?? 'unreviewed';
export const packingPriority = (item: PackingItem): PackingPriority => item.priority ?? (item.preparationStatus === 'optional' ? 'optional' : item.critical ? 'must' : 'recommended');
export const isPackingToBuy = (item: PackingItem) => packingStatus(item) === 'to-buy' ||
  (!item.custom && packingStatus(item) === 'unreviewed' && !item.packed && PACKING_GUIDANCE.get(item.id)?.ticketStatus === 'buy');
export const packingSummary = (items: PackingItem[]) => {
  const required = items.filter((item) => packingPriority(item) !== 'optional');
  return {
    total: items.length, packed: items.filter((item) => item.packed).length,
    required: required.length, requiredPacked: required.filter((item) => item.packed).length,
    criticalRemaining: required.filter((item) => packingPriority(item) === 'must' && !item.packed).length,
    toBuy: items.filter(isPackingToBuy).length,
    owned: items.filter((item) => packingStatus(item) === 'owned').length,
    unreviewed: items.filter((item) => packingStatus(item) === 'unreviewed').length,
    optional: items.length - required.length,
  };
};
// Ownership and completion are deliberately independent. Neither a checkmark
// nor a user classification changes the verified ticket facts.
export const updatePackingItem = (
  items: PackingItem[], id: string, patch: Partial<Omit<PackingItem, 'id'>>,
) => items.map((item) => item.id === id ? { ...item, ...patch } : item);
export const addPackingItem = (
  items: PackingItem[], label: string, category: PackingCategory, critical = false,
  preparationStatus: PackingStatus = 'unreviewed', quantity = '', priority: PackingPriority = critical ? 'must' : 'recommended',
): PackingItem[] => [...items, {
  id: `pack-custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  label: label.trim(), category, critical, packed: false, custom: true,
  preparationStatus, templateVersion: 2, quantity: quantity.trim(), priority,
}];
export type PackingFilter = 'all' | 'remaining' | 'packed' | 'optional' | PackingStatus;
export function filterPackingItems(items: PackingItem[], filter: PackingFilter, query: string, category: PackingCategory | 'all' = 'all', priority: PackingPriority | 'all' = 'all') {
  const search = query.trim().toLocaleLowerCase();
  return items.filter((item) => {
    const guidance = item.custom ? undefined : PACKING_GUIDANCE.get(item.id);
    const matchStatus = filter === 'all' || (filter === 'remaining' ? !item.packed && packingPriority(item) !== 'optional'
      : filter === 'packed' ? item.packed : filter === 'to-buy' ? isPackingToBuy(item) : filter === 'optional' ? packingPriority(item) === 'optional' : packingStatus(item) === filter);
    return matchStatus && (category === 'all' || item.category === category) && (priority === 'all' || packingPriority(item) === priority) &&
      (!search || `${item.label} ${guidance?.note ?? ''}`.toLocaleLowerCase().includes(search));
  }).sort((a, b) => PACKING_PRIORITIES.indexOf(packingPriority(a)) - PACKING_PRIORITIES.indexOf(packingPriority(b)));
}
