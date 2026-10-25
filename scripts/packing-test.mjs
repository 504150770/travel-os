import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_PACKING_ITEMS, PACKING_CATEGORIES, PACKING_GUIDANCE, PACKING_PRIORITIES, PACKING_STORAGE_KEY,
  addPackingItem, filterPackingItems, migratePackingItems, packingSummary, updatePackingItem,
} from '../features/packing/packingModel.ts';
import { parseBackup, writeBackupStorage } from '../features/app/backupModel.ts';

const data = JSON.parse(readFileSync(new URL('../data/preparation.json', import.meta.url), 'utf8'));
const plan = JSON.parse(readFileSync(new URL('../data/day-plans.json', import.meta.url), 'utf8'));
assert.equal(data.items.filter(item => item.category !== 'Tickets').length, 34);
assert.equal(data.items.filter(item => item.category === 'Tickets').length, 13);
assert.equal(data.items.filter(item => item.category === 'Preparation').length, 8);
assert.deepEqual(['must', 'recommended', 'optional'].map(priority => data.items.filter(item => item.category !== 'Tickets' && item.priority === priority).length), [14, 18, 2]);
assert.equal(new Set(DEFAULT_PACKING_ITEMS.map(item => item.id)).size, 47);
assert.equal(DEFAULT_PACKING_ITEMS.every(item => !item.packed), true, 'Recommendations must never start completed');
assert.deepEqual(DEFAULT_PACKING_ITEMS.filter(item => item.preparationStatus === 'owned').map(item => item.id), ['prep-suitcase']);
assert.equal(DEFAULT_PACKING_ITEMS.every(item => PACKING_CATEGORIES.includes(item.category)), true);
assert.equal(data.items.some(item => 'price' in item), false, 'No invented price or budget');
assert.match(PACKING_GUIDANCE.get('prep-suitcase').label, /68.5 × 43 × 26/);
assert.match(PACKING_GUIDANCE.get('prep-lock').note, /不能保证防盗/);
assert.match(PACKING_GUIDANCE.get('prep-lock').note, /不堵通道/);
assert.match(PACKING_GUIDANCE.get('ticket-louvre').note, /本次未重读附件/);
assert.match(PACKING_GUIDANCE.get('ticket-accademia').note, /重买前.*银行/);
assert.equal(PACKING_GUIDANCE.get('ticket-mestre-vienna').ticketStatus, 'buy');
for (const id of ['ticket-vatican', 'ticket-st-marks', 'ticket-louvre', 'ticket-rome-florence', 'ticket-florence-mestre', 'ticket-vienna-prague']) {
  assert.equal(PACKING_GUIDANCE.get(id).ticketStatus, 'issued');
}
for (const id of ['ticket-accademia', 'ticket-doge', 'ticket-schonbrunn', 'ticket-sainte-chapelle', 'ticket-opera', 'ticket-colosseum']) {
  assert.equal(PACKING_GUIDANCE.get(id).ticketStatus, 'verify');
}

const old = [
  { id: 'pack-01', label: 'Passport', category: 'Documents', packed: true, critical: true },
  { id: 'pack-19', label: '我改过的裤子', category: 'Clothing', packed: false, critical: true },
  { id: 'pack-16', label: 'Camera batteries', category: 'Electronics', packed: true, critical: false },
  { id: 'pack-custom-test', label: '自己的物品', category: 'Flight', packed: true, critical: false, custom: true },
];
const snapshot = JSON.stringify(old);
const migrated = migratePackingItems(old);
assert.equal(JSON.stringify(old), snapshot, 'Migration cannot mutate the original list');
assert.equal(migrated.find(item => item.id === 'pack-01').packed, true);
assert.equal(migrated.find(item => item.id === 'pack-01').preparationStatus, 'unreviewed', 'Completion must not imply ownership');
assert.equal(migrated.find(item => item.id === 'pack-19').label, '我改过的裤子');
assert.equal(migrated.find(item => item.id === 'pack-19').critical, true);
assert.deepEqual(migrated.find(item => item.id === 'pack-16'), { ...old[2], preparationStatus: 'unreviewed', priority: 'recommended', quantity: undefined, templateVersion: 2 });
assert.equal(migrated.find(item => item.id === 'pack-custom-test').packed, true);
assert.equal(migrated.some(item => item.id === 'pack-02'), false, 'Previously deleted rows stay deleted');
assert.equal(migrated.filter(item => item.id === 'prep-lock').length, 1);
assert.equal(migratePackingItems(migrated), migrated, 'Second migration is a no-op');
const removedLock = migrated.filter(item => item.id !== 'prep-lock');
assert.equal(migratePackingItems(removedLock).some(item => item.id === 'prep-lock'), false, 'Removed new suggestions stay removed');
assert.deepEqual(migratePackingItems([]), [], 'A deliberately empty list stays empty');

const shopping = updatePackingItem(DEFAULT_PACKING_ITEMS, 'prep-lock', { preparationStatus: 'to-buy' });
const checked = updatePackingItem(shopping, 'prep-lock', { packed: true });
assert.equal(checked.find(item => item.id === 'prep-lock').preparationStatus, 'to-buy', 'Two controls remain independent');
const edited = updatePackingItem(checked, 'pack-18', { quantity: '8 条', label: '我的换洗内裤' });
assert.equal(edited.find(item => item.id === 'pack-18').quantity, '8 条');
assert.equal(filterPackingItems(edited, 'to-buy', '锁').length, 1);
assert.equal(filterPackingItems(edited, 'all', '内裤', 'Clothing').length, 1);
assert.equal(filterPackingItems(edited, 'all', '无匹配物品').length, 0);
assert.equal(filterPackingItems(DEFAULT_PACKING_ITEMS, 'to-buy', '').some(item => item.id === 'ticket-mestre-vienna'), true);
assert.equal(filterPackingItems(DEFAULT_PACKING_ITEMS, 'to-buy', '').some(item => item.id === 'ticket-accademia'), false, 'Unverified tickets are not unpurchased');
const optional = updatePackingItem(edited, 'pack-01', { priority: 'optional' });
assert.equal(packingSummary(optional).criticalRemaining, packingSummary(edited).criticalRemaining - 1);
assert.equal(filterPackingItems(optional, 'remaining', '').some(item => item.id === 'pack-01'), false);
const ownedOptional = updatePackingItem(optional, 'pack-01', { preparationStatus: 'owned' });
assert.equal(filterPackingItems(ownedOptional, 'owned', '', 'all', 'optional')[0].id, 'pack-01', 'Optional and owned can coexist');
assert.equal(ownedOptional.find(item => item.id === 'pack-01').packed, false, 'Ownership is not completion');
const ordered = filterPackingItems([...DEFAULT_PACKING_ITEMS].reverse(), 'all', '');
const levels = ordered.map(item => PACKING_PRIORITIES.indexOf(item.priority));
assert.deepEqual(levels, [...levels].sort((a, b) => a - b), 'Priorities sort must, recommended, optional');
const reprioritized = updatePackingItem(ownedOptional, 'pack-01', { priority: 'recommended' });
assert.equal(reprioritized.find(item => item.id === 'pack-01').preparationStatus, 'owned');
assert.equal(migratePackingItems([{ ...DEFAULT_PACKING_ITEMS[0], preparationStatus: 'optional', priority: undefined }])[0].preparationStatus, 'unreviewed');
assert.equal(migratePackingItems([{ ...DEFAULT_PACKING_ITEMS[0], preparationStatus: 'optional', priority: undefined }])[0].priority, 'optional', 'Earlier optional classification migrates without inventing ownership');
const withCustom = addPackingItem(edited, '  备用眼镜  ', 'Daily Bag', false, 'owned', '1 副');
assert.equal(withCustom.at(-1).label, '备用眼镜');
assert.equal(withCustom.at(-1).packed, false);

const backup = { version: 5, exportedAt: '2026-10-25T00:00:00Z', currentItinerary: plan,
  customEntities: [], bookingStatuses: {}, actionStatuses: {}, actuals: {}, notes: '', favorites: {}, preferredTransport: {}, packingItems: withCustom };
const restored = parseBackup(JSON.stringify(backup));
assert.deepEqual(restored.packingItems, withCustom, 'V5 export/restore retains progress, quantities, custom rows and classification');
const storage = new Map([['unrelated', 'keep']]);
writeBackupStorage({ getItem: key => storage.get(key) ?? null, setItem: (key,value) => storage.set(key,value), removeItem: key => storage.delete(key) }, { [PACKING_STORAGE_KEY]: restored.packingItems });
assert.deepEqual(migratePackingItems(JSON.parse(storage.get(PACKING_STORAGE_KEY))), withCustom);
assert.equal(storage.get('unrelated'), 'keep');
for (const patch of [{ preparationStatus: 'purchased-by-ai' }, { preparationStatus: ['owned'] }, { priority: 'urgent-asap' }, { priority: ['must'] }, { templateVersion: 99 }, { quantity: 42 }]) {
  const bad = structuredClone(backup); Object.assign(bad.packingItems[0], patch);
  assert.throws(() => parseBackup(JSON.stringify(bad)));
}
const legacy = { ...backup, packingItems: old };
assert.deepEqual(parseBackup(JSON.stringify(legacy)).packingItems, old, 'Legacy V5 remains readable');
console.log('Packing tests passed: 34 + 13 facts, conservative defaults, independent ownership/completion, lossless/idempotent migration, filters, CRUD, quantities, V5 round-trip and invalid backup rejection.');
