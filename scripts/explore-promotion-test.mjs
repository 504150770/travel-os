import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as planModel from '../features/trip/planModel.ts';

// Execute the real hook, including transfer, commit and undo. Only React's
// state adapter and local storage are replaced with isolated in-memory state.
// No browser, private export or business storage is read or written.
function mountEditablePlan(initialPlan) {
  let stored = structuredClone(initialPlan);
  let stateCursor = 0;
  const stateSlots = [];
  const react = {
    useMemo: (factory) => factory(),
    useEffect: () => undefined,
    useState(initialValue) {
      const index = stateCursor++;
      if (!(index in stateSlots)) stateSlots[index] = typeof initialValue === 'function' ? initialValue() : initialValue;
      return [stateSlots[index], (value) => {
        stateSlots[index] = typeof value === 'function' ? value(stateSlots[index]) : value;
      }];
    },
  };
  const imports = {
    react,
    '@/data/day-plans.json': structuredClone(initialPlan),
    '@/hooks/use-local-storage': { useLocalStorage: () => [stored, (value) => { stored = value; }] },
    '@/features/trip/planModel': planModel,
  };
  const source = fs.readFileSync(new URL('../hooks/use-editable-plan.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      assert.ok(Object.hasOwn(imports, name), `Unexpected hook dependency: ${name}`);
      return imports[name];
    },
  }, { filename: 'use-editable-plan.test.cjs' });
  return () => {
    stateCursor = 0;
    return exports.useEditablePlan();
  };
}

const active = {
  id: 'user-active', entityId: 'active-place', order: 1,
  time: '09:15', duration: '40分钟', status: 'planned',
  notes: '保留正式安排', guard: '不要改动', ticket: '已确认',
};
const backup = {
  id: 'user-kept-backup', entityId: 'backup-place', order: 1,
  time: '14:20', duration: '75分钟', status: 'backup',
  notes: '用户填写的备选备注', guard: '最晚15:30离开', ticket: '已预约14:20',
};
const initialPlan = {
  version: 1, originalPlanId: 'test-current-plan',
  days: [
    { dayId: 1, activeItems: [active], alternatives: [backup], removedItems: [] },
    { dayId: 2, activeItems: [], alternatives: [], removedItems: [] },
  ],
};
const sourceSnapshot = structuredClone(initialPlan);
const render = mountEditablePlan(initialPlan);
let actions = render();
const placed = actions.placement(backup.entityId, 1);
assert.equal(placed.zone, 'backup');
assert.equal(placed.itemId, backup.id);
assert.equal(actions.placement(active.entityId, 1).zone, 'trip');
assert.equal(actions.placement(backup.entityId, 2), null, 'A backup on another day must not disable the selected day.');

actions.transfer(placed.dayId, placed.itemId, 'alternatives', 'activeItems');
actions = render();
const promoted = actions.plan.days[0].activeItems.find((item) => item.id === backup.id);
assert.deepEqual(JSON.parse(JSON.stringify(promoted)), { ...backup, status: 'planned', order: 2 });
assert.equal(actions.plan.days[0].alternatives.length, 0);
assert.deepEqual(JSON.parse(JSON.stringify(actions.plan.days[0].activeItems[0])), active);
assert.equal(actions.placement(backup.entityId, 1).zone, 'trip');
assert.equal(actions.placement(backup.entityId, 1).itemId, backup.id);
assert.equal(actions.undo.label, '加入行程');

actions.undoLast();
actions = render();
assert.deepEqual(JSON.parse(JSON.stringify(actions.plan)), sourceSnapshot, 'Undo restores the full backup and existing schedule.');
assert.equal(actions.undo, null);
assert.deepEqual(initialPlan, sourceSnapshot, 'The source fixture remains unchanged.');

// Wiring guards ensure both mobile surfaces and the shared desktop action use
// the field-preserving operation exercised above, not addEntity for a backup.
for (const file of ['components/mobile/MobileExplore.tsx', 'components/mobile/MobileEntitySheet.tsx']) {
  const ui = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.match(ui, /\.zone === 'backup'/);
  assert.match(ui, /controller\.actions\.transfer\([^\n]+\.itemId, 'alternatives', 'activeItems'\)/);
  assert.match(ui, /selectDay=\{controller\.selectMobileDay\}/);
}
const desktopActions = fs.readFileSync(new URL('../views/shared/EntityUi.tsx', import.meta.url), 'utf8');
assert.match(desktopActions, /transfer\(placed\.dayId, placed\.itemId, 'alternatives', 'activeItems'\)/);
assert.doesNotMatch(desktopActions, /addEntity\(entity\.id, placed\.dayId, 'activeItems'\)/);
console.log('Explore promotion tests passed: real hook transfer/undo preserve backup fields, distinguish placement states, and keep the chosen day explicit.');
