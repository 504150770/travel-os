import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseBackup, validateBackup, writeBackupStorage } from '../features/app/backupModel.ts';

const plan = JSON.parse(readFileSync(new URL('../data/day-plans.json', import.meta.url), 'utf8'));
const backup = {
  version: 5, exportedAt: '2026-10-02T00:00:00.000Z', currentItinerary: plan,
  customEntities: [], bookingStatuses: {}, actionStatuses: {}, actuals: {},
  notes: 'Test backup', favorites: {}, preferredTransport: {}, packingItems: [],
};
const before = JSON.stringify(backup);
// Historical export contracts: V3 task state, V4 unified action state,
// V5 packing. Optional fields are intentionally absent, not invented defaults.
const legacyV3 = {
  version: 3, exportedAt: backup.exportedAt, currentItinerary: plan,
  customEntities: [], bookingStatuses: {}, taskStatuses: { sample: 'Done' },
  checkinCompleted: {}, deadlineStatuses: {}, actuals: {}, notes: '', favorites: {},
};
const legacyV4 = {
  version: 4, exportedAt: backup.exportedAt, currentItinerary: plan,
  customEntities: [], bookingStatuses: {}, actionStatuses: { 'task:sample': 'Done' },
  actuals: {}, notes: '', favorites: {}, preferredTransport: {},
};
assert.deepEqual(parseBackup(JSON.stringify(legacyV3)), legacyV3);
assert.deepEqual(parseBackup(JSON.stringify(legacyV4)), legacyV4);
assert.equal(validateBackup(legacyV3).packingItems, undefined);
assert.equal(validateBackup(legacyV4).packingItems, undefined);
const known = new Set(plan.days.flatMap(day => [...day.activeItems, ...day.alternatives, ...(day.removedItems ?? [])].map(item => item.entityId)));
assert.deepEqual(parseBackup(before), backup);
assert.equal(validateBackup(backup, known), backup);
assert.equal(JSON.stringify(backup), before, 'validation must not change the plan');
for (const fixture of [legacyV3, legacyV4, backup]) assert.equal(validateBackup(fixture).version, fixture.version);
for (const [fixture, required] of [[legacyV3, 'taskStatuses'], [legacyV4, 'actionStatuses'], [legacyV4, 'preferredTransport'], [backup, 'actionStatuses'], [backup, 'preferredTransport'], [backup, 'packingItems']]) {
  const incomplete = structuredClone(fixture);
  delete incomplete[required];
  assert.throws(() => validateBackup(incomplete), `V${fixture.version} must reject missing ${required}`);
}
assert.throws(() => parseBackup('{broken'), /JSON/);
assert.throws(() => validateBackup({ ...backup, version: 6 }));
for (const change of [
  b => { b.version = 2; },
  b => { b.currentItinerary.days.pop(); },
  b => { b.currentItinerary.days[1].dayId = 1; },
  b => { delete b.currentItinerary.days[0].activeItems[0].duration; },
  b => { b.currentItinerary.days[0].activeItems[0].entityId = 'unknown'; },
  b => { b.currentItinerary.days[0].alternatives.push(b.currentItinerary.days[0].activeItems[0]); },
  b => { b.actuals.sample = '100'; },
  b => { b.favorites.sample = 'true'; },
  b => { b.customEntities.push({ id: 'broken', name: 'Incomplete' }); },
  b => { b.packingItems.push({ id: 'p', label: 'Test', category: 'unknown', packed: false, critical: false }); },
  b => { b.notes = null; },
]) {
  const invalid = structuredClone(backup);
  change(invalid);
  assert.throws(() => validateBackup(invalid, known));
}
assert.throws(() => parseBackup(before.replace('"favorites":{}', '"favorites":{"__proto__":true}')));
const custom = {
  id: 'custom-test', name: 'Test', type: 'custom', city: 'Rome', address: '', mapQuery: '',
  coordinates: null, images: [], description: '', priceLabel: '', projectedCostCny: null,
  openingHours: '', links: {}, source: '', lastVerified: '', tags: [], notes: '', raw: {},
};
const withCustom = structuredClone(backup);
withCustom.customEntities.push(custom);
withCustom.currentItinerary.days[0].activeItems[0].entityId = custom.id;
assert.equal(validateBackup(withCustom, known), withCustom);

const saved = new Map([['plan', 'original'], ['private-checkin', 'unchanged']]);
let failOnce = true;
const storage = {
  getItem: key => saved.get(key) ?? null,
  setItem: (key, value) => {
    if (key === 'notes' && failOnce) { failOnce = false; throw new Error('quota'); }
    saved.set(key, value);
  },
  removeItem: key => saved.delete(key),
};
assert.throws(() => writeBackupStorage(storage, { plan: { updated: true }, notes: 'new' }), /撤回/);
assert.deepEqual([...saved], [['plan', 'original'], ['private-checkin', 'unchanged']]);
const circular = {}; circular.self = circular;
assert.throws(() => writeBackupStorage(storage, { plan: 'new', notes: circular }));
assert.equal(saved.get('plan'), 'original', 'serialization failure must precede every write');
writeBackupStorage(storage, { plan: { updated: true }, notes: 'new' });
assert.equal(saved.get('plan'), '{"updated":true}');
assert.equal(saved.get('private-checkin'), 'unchanged');
const failedRollback = {
  getItem: key => key === 'plan' ? 'original' : null,
  setItem: () => { throw new Error('unavailable'); },
  removeItem: () => { throw new Error('unavailable'); },
};
assert.throws(() => writeBackupStorage(failedRollback, { plan: 'new' }), /部分本地数据可能未能恢复/);
const silentFailure = {
  getItem: () => 'original', setItem: () => {}, removeItem: () => {},
};
assert.throws(() => writeBackupStorage(silentFailure, { plan: 'new' }), /撤回/);
console.log('Backup model tests passed: V3/V4/V5, plan/entity validation, no mutation, atomic rollback and private-key isolation. Browser import still requires separate actual interaction verification.');
