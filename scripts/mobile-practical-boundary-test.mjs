import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as actionModel from '../lib/action-queue.ts';
import * as appModel from '../features/app/appModel.ts';
import * as mobileTransportModel from '../components/mobile/mobileTransportModel.ts';
import { canonicalBookings } from '../lib/hotel-execution.ts';

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const guideData = {
  days: read('days'),
  deadlines: read('deadlines'),
  tasks: read('tasks'),
  bookings: read('bookings'),
};
const realStays = read('hotel-bookings').items;
const transportSegments = read('transport-recommendations').segments;
const factsBefore = JSON.stringify({ guideData, realStays, transportSegments });

const interactionImports = {
  '@/lib/action-queue': actionModel,
  '@/features/app/appModel': appModel,
  '@/components/mobile/mobileTransportModel': mobileTransportModel,
};
const interactionModel = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../features/plan/interactionModel.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports: interactionModel,
  require: (name) => {
    assert.ok(Object.hasOwn(interactionImports, name), `Unexpected interaction dependency: ${name}`);
    return interactionImports[name];
  },
}, { filename: 'interactionModel.mobile.test.cjs' });
assert.equal(interactionModel.bookingStatusEditable, mobileTransportModel.mobileBookingStatusEditable);
assert.equal(interactionModel.transportPreferenceAllowed, mobileTransportModel.transportPreferenceAllowed);

// Render the actual component to a JSX tree and invoke its actual handlers.
// React effects/lazy UI and the controller's storage are isolated adapters;
// booking/task derivation uses the real shared models and public source data.
const element = (type, props, key) => ({ type, props: props ?? {}, key });
const imports = {
  'react/jsx-runtime': { jsx: element, jsxs: element },
  react: {
    useRef: () => ({ current: null }),
    useEffect: () => undefined,
    lazy: () => () => null,
    Suspense: () => null,
  },
  'lucide-react': Object.fromEntries(['CalendarCheck', 'Check', 'ChevronDown', 'Circle', 'CreditCard'].map((name) => [name, () => null])),
  '@/features/app/appModel': appModel,
  '@/lib/data': { guideData },
  '@/lib/action-queue': actionModel,
  '@/features/trip/tripModel': { realStays, transportSegments },
  '@/features/plan/usePlanController': {
    usePlanController: ({ bookingStatuses }) => ({
      bookings: canonicalBookings(realStays, guideData.bookings.items).map((booking) => ({
        ...booking, status: bookingStatuses[booking.id] ?? booking.status,
      })),
    }),
  },
  '@/components/mobile/MobileTransportPanel': { MobileTransportPanel: () => null },
  '@/components/mobile/mobileTransportModel': mobileTransportModel,
  '@/features/plan/interactionModel': interactionModel,
  '@/components/mobile/mobile-plan.css': {},
};
const componentSource = fs.readFileSync(new URL('../components/mobile/MobilePlan.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(componentSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, {
  exports,
  require: (name) => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected component dependency: ${name}`);
    return imports[name];
  },
}, { filename: 'MobilePlan.boundary.test.cjs' });

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function textOf(tree) {
  if (Array.isArray(tree)) return tree.map(textOf).join('');
  if (tree == null || typeof tree === 'boolean') return '';
  if (typeof tree !== 'object') return String(tree);
  return textOf(tree.props?.children);
}
function mount({ bookingStatuses = {}, actionStatuses = {}, day = 2 } = {}) {
  let storedBookings = structuredClone(bookingStatuses);
  let storedActions = structuredClone(actionStatuses);
  let writes = 0;
  const snapshot = () => JSON.parse(JSON.stringify({ storedBookings, storedActions, writes }));
  const render = (planTab) => {
    const effectiveBookings = { ...storedBookings, 'flight-can-fco': 'Ticketed', 'flight-cdg-can': 'Ticketed' };
    const mergedActions = appModel.mergeBookingActionStatuses(storedActions, effectiveBookings);
    const queue = actionModel.buildActionQueue({
      deadlines: guideData.deadlines, tasks: guideData.tasks.items,
      stays: realStays, statuses: mergedActions, bookingStatuses: effectiveBookings,
    });
    return exports.MobilePlan({ controller: {
      selectedDay: day, planTab, bookingStatuses: effectiveBookings,
      actionStatuses: Object.fromEntries(queue.map((item) => [item.id, item.status])),
      budgetState: {},
      setBookingStatuses: (value) => { storedBookings = value; writes += 1; },
      setActionStatuses: (value) => { storedActions = value; writes += 1; },
      selectMobilePlanTab: () => undefined,
      openDocumentForBooking: () => undefined,
    } });
  };
  return { render, snapshot };
}
function row(tree, attribute, id) {
  const result = nodes(tree).find((node) => node.type === 'article' && node.props[attribute] === id);
  assert.ok(result, `Missing rendered row ${id}`);
  return result;
}
const buttons = (tree) => nodes(tree).filter((node) => node.type === 'button');
const selects = (tree) => nodes(tree).filter((node) => node.type === 'select');

// The controller preserves the two ticketed international flight facts even
// when storage contains another value. Their controls must not offer a write
// that will immediately be overwritten on the following render.
const locked = mount({ bookingStatuses: { 'flight-can-fco': 'Cancelled' }, actionStatuses: { 'deadline:transport-international': 'Waiting' } });
for (const id of ['flight-can-fco', 'flight-cdg-can']) {
  const booking = row(locked.render('bookings'), 'data-booking-id', id);
  assert.match(textOf(booking), /状态：Ticketed/);
  assert.equal(selects(booking).length, 0, `${id} must not offer an ineffective status edit.`);
}
for (const tab of ['deadlines', 'tasks']) {
  const action = row(locked.render(tab), 'data-action-id', 'deadline:transport-international');
  assert.equal(buttons(action).length, 0, `The ${tab} alias must not offer an ineffective undo.`);
  assert.match(textOf(action), /由订单状态自动完成/);
}
assert.equal(locked.snapshot().writes, 0);

// Each completed ticket status follows the shared derivation, including the
// task/deadline alias for colosseum; research and ordinary manual completion
// must remain editable. A later real booking change releases that derivation.
for (const status of ['Ticketed', 'Booked', 'Paid', 'Confirmed', 'Completed']) {
  const synced = mount({ bookingStatuses: { colosseum: status }, actionStatuses: { 'deadline:ticket-colosseum': 'Waiting' } });
  for (const tab of ['deadlines', 'tasks']) {
    const action = row(synced.render(tab), 'data-action-id', 'deadline:ticket-colosseum');
    assert.equal(buttons(action).length, 0, `${status} must control both action aliases.`);
    assert.match(textOf(action), /由订单状态自动完成/);
  }
  const bookingSelect = selects(row(synced.render('bookings'), 'data-booking-id', 'colosseum'))[0];
  assert.ok(bookingSelect, 'User-managed ticket bookings remain editable.');
  bookingSelect.props.onChange({ target: { value: 'To Book' } });
  for (const tab of ['deadlines', 'tasks']) {
    assert.equal(buttons(row(synced.render(tab), 'data-action-id', 'deadline:ticket-colosseum')).length, 1);
  }
}

const manual = mount();
const manualId = 'task:hold-hotels';
const beforeManual = manual.snapshot();
buttons(row(manual.render('tasks'), 'data-action-id', manualId))[0].props.onClick();
assert.equal(manual.snapshot().storedActions[manualId], 'Waiting', 'A manually completed task can still be reopened.');
buttons(row(manual.render('tasks'), 'data-action-id', manualId))[0].props.onClick();
assert.equal(manual.snapshot().storedActions[manualId], 'Done');
assert.deepEqual(manual.snapshot().storedBookings, beforeManual.storedBookings, 'Task toggles must not edit orders.');

const checkinId = actionModel.checkinActionId(realStays[0].id);
buttons(row(manual.render('checkin'), 'data-action-id', checkinId))[0].props.onClick();
assert.equal(manual.snapshot().storedActions[checkinId], 'Done');
buttons(row(manual.render('checkin'), 'data-action-id', checkinId))[0].props.onClick();
assert.equal(manual.snapshot().storedActions[checkinId], 'Waiting');

const unresolved = mount();
const trainSelect = selects(row(unresolved.render('bookings'), 'data-booking-id', 'train-rome-florence'))[0];
assert.ok(trainSelect, 'Unticketed European transport retains the existing edit.');
trainSelect.props.onChange({ target: { value: 'Booked' } });
assert.equal(unresolved.snapshot().storedBookings['train-rome-florence'], 'Booked');
assert.equal(JSON.stringify({ guideData, realStays, transportSegments }), factsBefore, 'Rendering and model checks must not mutate facts.');
console.log('Mobile practical boundary tests passed: actual component controls follow locked flight and booking-derived action rules; manual edits/check-in remain effective.');
