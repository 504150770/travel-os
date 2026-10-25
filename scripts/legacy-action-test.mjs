import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as actionModel from '../lib/action-queue.ts';
import { validateBackup, writeBackupStorage } from '../features/app/backupModel.ts';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const deadlines = JSON.parse(read('data/deadlines.json'));
const plan = JSON.parse(read('data/day-plans.json'));
const modernKey = 'europe-guide-action-statuses-v4';
const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const model = {};
vm.runInNewContext(compile(read('features/app/legacyActionModel.ts')), {
  exports: model,
  require: (name) => {
    assert.equal(name, '@/lib/action-queue');
    return actionModel;
  },
});
const { migrateLegacyActionStatuses } = model;
const plain = (value) => JSON.parse(JSON.stringify(value));

const legacy = {
  taskStatuses: { 'visa-appointment': 'Doing', 'monitor-flights': 'Done', 'colosseum-release': 'Ready', 'final-72': 'Waiting', sample: 'Done' },
  deadlineStatuses: { 'visa-appointment': 'Done', 'online-checkin': 'Done', 'hotel-cancel': 'Ready', unknown: 'Done' },
  checkinCompleted: { hotel: false, other: true },
};
const fixtureDeadlines = [
  { id: 'visa-appointment', category: 'Visa' },
  { id: 'online-checkin', category: 'Online check-in', hotelId: 'hotel' },
  { id: 'hotel-cancel', category: 'Hotel cancellation', hotelId: 'hotel' },
];
const snapshot = JSON.stringify(legacy);
const migrated = migrateLegacyActionStatuses(legacy, fixtureDeadlines);
assert.deepEqual(plain(migrated), {
  'deadline:visa-appointment': 'Done', 'deadline:transport-international': 'Done',
  'deadline:ticket-colosseum': 'Ready', 'deadline:final-72h': 'Waiting',
  'task:sample': 'Done', 'checkin:hotel': 'Waiting', 'deadline:hotel-cancel': 'Ready', 'checkin:other': 'Done',
});
assert.equal(JSON.stringify(legacy), snapshot, 'Migration must not alter the source backup');
assert.deepEqual(plain(migrateLegacyActionStatuses(legacy, fixtureDeadlines)), plain(migrated));
for (const actionStatuses of [{}, { 'task:modern': 'Ready' }]) {
  assert.equal(migrateLegacyActionStatuses({ ...legacy, actionStatuses }, fixtureDeadlines), actionStatuses, 'A complete modern snapshot takes precedence over all legacy fields');
}

// Exercise the actual controller import handler and mount migration with an
// isolated in-memory storage adapter; no browser or user storage is accessed.
const source = read('features/app/useAppController.ts');
const importStart = source.indexOf('  const importBackup =');
const importEnd = source.indexOf('\n  const daysLeft', importStart);
assert.ok(importStart >= 0 && importEnd > importStart);
const migrationStart = source.lastIndexOf('  useEffect(() => {', source.indexOf('const legacyTasks'));
const migrationEnd = source.indexOf('  }, [storedActionStatuses, setActionStatuses]);', migrationStart);
assert.ok(migrationStart >= 0 && migrationEnd > migrationStart);
const migrationBody = source.slice(migrationStart + '  useEffect(() => {'.length, migrationEnd);
const saved = new Map();
let reloads = 0;
let migrationWrites = 0;
let storageReads = [];
const storage = {
  getItem: (key) => { storageReads.push(key); return saved.get(key) ?? null; },
  setItem: (key, value) => saved.set(key, value),
  removeItem: (key) => saved.delete(key),
};
const handlers = {};
vm.runInNewContext(compile(`${source.slice(importStart, importEnd)}\nexports.importBackup = importBackup;\nexports.mountMigration = () => {${migrationBody}};`), {
  exports: handlers, validateBackup, writeBackupStorage, migrateLegacyActionStatuses,
  guideData: { deadlines }, localStorage: storage,
  entityLibrary: plan.days.flatMap((day) => [...day.activeItems, ...day.alternatives, ...(day.removedItems ?? [])]).map((item) => ({ id: item.entityId })),
  PACKING_STORAGE_KEY: 'europe-guide-packing-v1',
  setActionStatuses: (next) => { migrationWrites++; storage.setItem(modernKey, JSON.stringify(next)); },
  window: { location: { reload: () => { reloads++; } } },
});
const legacyV3 = {
  version: 3, exportedAt: '2026-10-25T00:00:00.000Z', currentItinerary: plan,
  customEntities: [], bookingStatuses: {}, actuals: {}, notes: '', favorites: {},
  taskStatuses: { sample: 'Done' }, deadlineStatuses: { 'visa-appointment': 'Done' },
  checkinCompleted: { 'stay-vienna-jimmys': true, 'stay-test-waiting': false },
};
const preservedPacking = JSON.stringify([{ id: 'pack-custom-preserve', label: 'Test item', category: 'Clothing', packed: true, critical: false }]);
saved.set('europe-guide-packing-v1', preservedPacking);
saved.set('europe-guide-preferred-transport-v1', '{"sample":"train"}');
handlers.importBackup(legacyV3);
assert.equal(saved.get('europe-guide-packing-v1'), preservedPacking, 'V3 without packing preserves local checkmarks');
assert.equal(saved.get('europe-guide-preferred-transport-v1'), '{"sample":"train"}', 'V3 missing transport preserves the local choice');
assert.deepEqual(JSON.parse(saved.get(modernKey)), {
  'task:sample': 'Done', 'deadline:visa-appointment': 'Done',
  'checkin:stay-vienna-jimmys': 'Done', 'checkin:stay-test-waiting': 'Waiting',
});
assert.equal(reloads, 1, 'The import reload follows the completed storage transaction');

saved.set('europe-guide-task-statuses', JSON.stringify({ obsolete: 'Done' }));
saved.set('travel-deadline-statuses-v1', JSON.stringify({ 'visa-appointment': 'Done' }));
saved.set('travel-checkin-completed-v1', JSON.stringify({ obsolete: true }));
for (const version of [4, 5]) {
  handlers.importBackup({ ...legacyV3, version, actionStatuses: {}, preferredTransport: {}, ...(version === 5 ? { packingItems: [] } : {}) });
  assert.equal(saved.get('europe-guide-packing-v1'), version === 4 ? preservedPacking : '[]', 'Missing packing keeps data; an explicit empty list clears it');
  assert.equal(saved.get('europe-guide-preferred-transport-v1'), '{}', 'V4/V5 explicit transport map replaces the local value');
  storageReads = [];
  handlers.mountMigration();
  assert.deepEqual(JSON.parse(saved.get(modernKey)), {}, `V${version} empty action state must survive reopening`);
  assert.deepEqual(storageReads, [modernKey], 'An existing modern key must prevent reading stale legacy data');
}
assert.equal(migrationWrites, 0);
saved.delete(modernKey);
handlers.mountMigration();
assert.deepEqual(JSON.parse(saved.get(modernKey)), { 'task:obsolete': 'Done', 'deadline:visa-appointment': 'Done', 'checkin:obsolete': 'Done' });
handlers.mountMigration();
assert.equal(migrationWrites, 1, 'An absent modern key migrates legacy device state once');
saved.delete(modernKey);
saved.set('europe-guide-task-statuses', '{broken');
handlers.mountMigration();
assert.equal(saved.has(modernKey), false, 'Unreadable legacy storage remains untouched');
assert.equal(migrationWrites, 1);
console.log('Legacy action tests passed: V3 full-state import, shared alias and precedence rules, V4/V5 empty-state reopening, one-time device migration and unreadable-storage isolation.');
