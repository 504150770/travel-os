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
  deadlines: read('deadlines'), tasks: read('tasks'),
  bookings: read('bookings'), hotelBookings: read('hotel-bookings'),
};
const realStays = guideData.hotelBookings.items;
const originalSegments = read('transport-recommendations').segments;
const factsBefore = JSON.stringify({ guideData, originalSegments });
const tripModel = { realStays, transportSegments: originalSegments };
const element = (type, props, key) => ({ type, props: props ?? {}, key });
const react = { lazy: () => () => null, Suspense: () => null, useState: (value) => [value, () => undefined] };
const icons = Object.fromEntries([
  'Check', 'Circle', 'Clock3', 'ChevronDown', 'ExternalLink', 'BedDouble',
  'BusFront', 'CarTaxiFront', 'Footprints', 'MapPinned', 'Navigation', 'Plane', 'ShieldAlert',
].map((name) => [name, () => null]));

// Execute the actual shared model and desktop components. Only React's render
// adapter, lazy unrelated panels and browser storage are isolated; all booking
// and action derivation comes from the real shared models and public data.
function compile(file, imports) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    },
  }).outputText, {
    exports,
    require: (name) => {
      assert.ok(Object.hasOwn(imports, name), `Unexpected ${file} dependency: ${name}`);
      return imports[name];
    },
  }, { filename: `${file}.boundary.test.cjs` });
  return exports;
}
const interactionModel = compile('features/plan/interactionModel.ts', {
  '@/lib/action-queue': actionModel,
  '@/features/app/appModel': appModel,
  '@/components/mobile/mobileTransportModel': mobileTransportModel,
});
assert.equal(interactionModel.bookingStatusEditable, mobileTransportModel.mobileBookingStatusEditable);
assert.equal(interactionModel.transportPreferenceAllowed, mobileTransportModel.transportPreferenceAllowed);
const executionCards = compile('components/execution-cards.tsx', {
  react, 'react/jsx-runtime': { jsx: element, jsxs: element },
  'lucide-react': icons, 'next/image': () => null,
  '@/lib/private-links': { safePrivateLink: () => undefined },
  '@/lib/action-queue': actionModel, '@/lib/media': {},
});
const desktop = compile('views/plan/PlanView.tsx', {
  react, 'react/jsx-runtime': { jsx: element, jsxs: element },
  'lucide-react': icons, '@/lib/data': { guideData },
  '@/lib/action-queue': actionModel, '@/features/app/appModel': appModel,
  '@/components/execution-cards': executionCards,
  '@/features/trip/tripModel': tripModel,
  '@/features/plan/interactionModel': interactionModel,
  '@/features/plan/usePlanController': {
    usePlanController: ({ bookingStatuses }) => ({
      bookings: canonicalBookings(realStays, guideData.bookings.items).map((booking) => ({
        ...booking, status: bookingStatuses[booking.id] ?? booking.status,
      })),
      tasks: guideData.tasks.items,
    }),
  },
});
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  if (tree.type === executionCards.DeadlineCenter) return nodes(executionCards.DeadlineCenter(tree.props));
  return [tree, ...nodes(tree.props?.children)];
}
function textOf(tree) {
  if (Array.isArray(tree)) return tree.map(textOf).join('');
  if (tree == null || typeof tree === 'boolean') return '';
  if (typeof tree !== 'object') return String(tree);
  return textOf(tree.props?.children);
}
const buttons = (tree) => nodes(tree).filter((node) => node.type === 'button');
const selects = (tree) => nodes(tree).filter((node) => node.type === 'select');
function row(tree, attribute, id) {
  const result = nodes(tree).find((node) => node.props[attribute] === id);
  assert.ok(result, `Missing rendered row ${id}`);
  return result;
}
function bookingRow(tree, id) {
  const booking = guideData.bookings.items.find((item) => item.id === id);
  const result = nodes(tree).find((node) => node.type === 'details' && nodes(node).some((child) => child.type === 'h3' && textOf(child) === booking.title));
  assert.ok(result, `Missing rendered booking ${id}`);
  return result;
}
function transportRow(tree, id, segments) {
  const segment = segments.find((item) => item.id === id);
  const result = nodes(tree).find((node) => node.type === 'article' && nodes(node).some((child) => child.type === 'h2' && textOf(child) === segment.route));
  assert.ok(result, `Missing rendered transport ${id}`);
  return result;
}
function mount({ bookingStatuses = {}, actionStatuses = {}, segments = originalSegments } = {}) {
  let storedBookings = structuredClone(bookingStatuses);
  let storedActions = structuredClone(actionStatuses);
  let storedPreferred = {};
  let writes = 0;
  const snapshot = () => JSON.parse(JSON.stringify({ storedBookings, storedActions, storedPreferred, writes }));
  const render = (tab) => {
    tripModel.transportSegments = segments;
    const effectiveBookings = { ...storedBookings, 'flight-can-fco': 'Ticketed', 'flight-cdg-can': 'Ticketed' };
    const queue = actionModel.buildActionQueue({
      deadlines: guideData.deadlines, tasks: guideData.tasks.items, stays: realStays,
      statuses: appModel.mergeBookingActionStatuses(storedActions, effectiveBookings),
      bookingStatuses: effectiveBookings,
    });
    return desktop.PlanView({
      controller: { openDocumentForBooking: () => undefined }, tab, setTab: () => undefined,
      bookingStatuses: effectiveBookings, setBookingStatuses: (value) => { storedBookings = value; writes += 1; },
      actionStatuses: Object.fromEntries(queue.map((item) => [item.id, item.status])),
      setActionStatuses: (value) => { storedActions = value; writes += 1; },
      preferredTransport: storedPreferred, setPreferredTransport: (value) => { storedPreferred = value; writes += 1; },
      actuals: {}, setActuals: () => undefined, budgetState: {},
      privateLinks: {}, setPrivateLinks: () => undefined,
    });
  };
  return { render, snapshot };
}

const locked = mount({ bookingStatuses: { 'flight-can-fco': 'Cancelled' }, actionStatuses: { 'deadline:transport-international': 'Waiting' } });
for (const id of ['flight-can-fco', 'flight-cdg-can']) {
  const booking = bookingRow(locked.render('bookings'), id);
  assert.equal(selects(booking).length, 0, `${id} must not offer an ineffective status edit.`);
  assert.match(textOf(booking), /Ticketed/);
}
for (const id of ['can-fco', 'paris-can']) {
  assert.equal(buttons(transportRow(locked.render('transport'), id, originalSegments)).length, 0, 'Ticketed transport must not write preferences.');
}
for (const tab of ['tasks', 'deadlines']) {
  const action = row(locked.render(tab), 'data-action-id', 'deadline:transport-international');
  assert.match(textOf(action), /由订单状态自动完成/);
  for (const control of [...buttons(action), ...selects(action)]) {
    assert.equal(control.props.disabled, true, `The ${tab} control must be read-only.`);
    control.props.onClick?.();
    control.props.onChange?.({ target: { value: 'Open' } });
  }
}
assert.equal(locked.snapshot().writes, 0, 'Even direct invocation of disabled handlers must not write a derived status.');

for (const status of ['Ticketed', 'Booked', 'Paid', 'Confirmed', 'Completed']) {
  const synced = mount({ bookingStatuses: { colosseum: status }, actionStatuses: { 'deadline:ticket-colosseum': 'Waiting' } });
  for (const tab of ['tasks', 'deadlines']) {
    const action = row(synced.render(tab), 'data-action-id', 'deadline:ticket-colosseum');
    assert.match(textOf(action), /由订单状态自动完成/);
    assert.ok([...buttons(action), ...selects(action)].every((control) => control.props.disabled === true));
  }
  const bookingSelect = selects(bookingRow(synced.render('bookings'), 'colosseum'))[0];
  assert.ok(bookingSelect, 'User-managed attraction orders remain editable.');
  bookingSelect.props.onChange({ target: { value: 'To Book' } });
  for (const tab of ['tasks', 'deadlines']) {
    const controls = [...buttons(row(synced.render(tab), 'data-action-id', 'deadline:ticket-colosseum')), ...selects(row(synced.render(tab), 'data-action-id', 'deadline:ticket-colosseum'))];
    assert.ok(controls.length > 0 && controls.every((control) => !control.props.disabled));
  }
}

const manual = mount();
const taskId = 'task:hold-hotels';
buttons(row(manual.render('tasks'), 'data-action-id', taskId))[0].props.onClick();
assert.equal(manual.snapshot().storedActions[taskId], 'Open', 'A manual default Done is not locked.');
selects(row(manual.render('tasks'), 'data-action-id', taskId))[0].props.onChange({ target: { value: 'Doing' } });
assert.equal(manual.snapshot().storedActions[taskId], 'Doing');
buttons(row(manual.render('tasks'), 'data-action-id', taskId))[0].props.onClick();
assert.equal(manual.snapshot().storedActions[taskId], 'Done');
selects(row(manual.render('deadlines'), 'data-action-id', 'deadline:transport-europe'))[0].props.onChange({ target: { value: 'Ready' } });
assert.equal(manual.snapshot().storedActions['deadline:transport-europe'], 'Ready');

const train = mount();
const trainButton = buttons(transportRow(train.render('transport'), 'rome-florence', originalSegments))[0];
assert.ok(trainButton, 'An unconfirmed European candidate remains selectable.');
trainButton.props.onClick();
assert.equal(train.snapshot().storedPreferred['rome-florence'], originalSegments.find((segment) => segment.id === 'rome-florence').candidates[0].rank);

// Protect either side of the boundary, including a ticketed segment carrying
// an unticketed candidate. These are isolated in-memory fixtures, not new facts.
for (const lockOn of ['segment', 'candidate']) {
  const segment = structuredClone(originalSegments.find((item) => item.id === 'rome-florence'));
  segment.candidates = [segment.candidates[0]];
  const candidate = segment.candidates[0];
  const fixture = mount({ segments: [segment] });
  const selectable = buttons(transportRow(fixture.render('transport'), segment.id, [segment]))[0];
  assert.ok(selectable);
  if (lockOn === 'segment') segment.status = 'TICKETED';
  else candidate.status = 'TICKETED';
  selectable.props.onClick();
  assert.equal(fixture.snapshot().writes, 0, `The handler must guard a newly ticketed ${lockOn}.`);
  assert.equal(buttons(transportRow(fixture.render('transport'), segment.id, [segment])).length, 0);
}

let standaloneWrites = 0;
const standalone = executionCards.DeadlineCenter({
  items: guideData.deadlines, statuses: { 'deadline:transport-international': 'Done' },
  setStatuses: () => { standaloneWrites += 1; },
});
const standaloneSelect = selects(row(standalone, 'data-action-id', 'deadline:transport-international'))[0];
assert.equal(Boolean(standaloneSelect.props.disabled), false, 'Omitting the optional readonly set preserves DeadlineCenter behavior.');
standaloneSelect.props.onChange({ target: { value: 'Open' } });
assert.equal(standaloneWrites, 1);
assert.equal(JSON.stringify({ guideData, originalSegments }), factsBefore, 'Checks must not mutate source facts.');
console.log('Desktop practical boundary tests passed: actual booking/transport/task/deadline handlers follow shared readonly rules; normal edits and optional DeadlineCenter compatibility remain.');
