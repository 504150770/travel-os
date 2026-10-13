import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute actual sheet JSX, mapLinks and gallery helpers in memory. Only the
// renderer, enclosing sheet/target controls and unrelated guide inputs are adapted.
const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const element = (type, props, key) => ({ type, props: props ?? {}, key });
function compile(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    URL,
    window: { setTimeout: (callback) => callback() },
    require: (name) => {
      assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`);
      return imports[name];
    },
  }, { filename: `${file}.entity-navigation.test.cjs` });
  return exports;
}
const media = compile('lib/media.ts');
const tripModel = compile('features/trip/tripModel.ts', {
  '@/lib/data': { guideData: { hotelBookings: { items: [] }, transportRecommendations: { segments: [] }, dayRoutes: [], transitDayExecution: [] } },
  '@/lib/entity-library': { normalizeRouteCity: (city) => city },
  '@/features/trip/bookingEntityMap': { ticketBookingByEntity: {} },
});
const navigationModel = compile('features/trip/entityNavigation.ts', {
  '@/features/trip/tripModel': tripModel,
});
const MobileSheet = () => null;
const MobilePlanTarget = () => null;
const sheet = compile('components/mobile/MobileEntitySheet.tsx', {
  'react/jsx-runtime': { jsx: element, jsxs: element },
  'next/image': { default: () => null },
  'lucide-react': Object.fromEntries(['Camera', 'Navigation', 'Plus'].map((name) => [name, () => null])),
  '@/features/trip/entityNavigation': navigationModel,
  '@/lib/media': media,
  '@/components/mobile/MobileSheet': { MobileSheet },
  '@/components/mobile/MobilePlanTarget': { MobilePlanTarget },
});
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function textOf(tree) {
  if (Array.isArray(tree)) return tree.map(textOf).join('');
  if (tree == null || typeof tree === 'boolean') return '';
  return typeof tree === 'object' ? textOf(tree.props?.children) : String(tree);
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
const entity = (overrides = {}) => freeze({
  id: 'fixture-entity', type: 'activity', name: 'Fixture arrival and luggage', city: 'Fixture city',
  address: '待确认', mapQuery: 'Fixture arrival and luggage', coordinates: null, images: [],
  description: 'Fixture description', notes: 'Fixture notes', priceLabel: '不适用',
  openingHours: '不适用', lastVerified: 'Fixture verification', source: '', links: {}, tags: [], raw: {}, ...overrides,
});
function render(value, { selectedDay = 18, placement = null } = {}) {
  const calls = { placement: [], add: [], transfer: [], day: [], gallery: [], close: 0 };
  const controller = {
    selectedDay,
    actions: {
      placement: (...args) => { calls.placement.push(args); return placement; },
      addEntity: (...args) => calls.add.push(args),
      transfer: (...args) => calls.transfer.push(args),
    },
    selectMobileDay: (...args) => calls.day.push(args),
    setLightbox: (request) => calls.gallery.push(request),
  };
  const tree = sheet.MobileEntitySheet({ entity: value, controller, close: () => { calls.close += 1; } });
  return { tree, calls, links: nodes(tree).filter((node) => node.type === 'a') };
}
const activityRows = JSON.parse(read('data/activities.json'));
const sourceBefore = JSON.stringify(activityRows);
const arrival = activityRows.find((row) => row.id === 'activity-d18-01');
assert.equal(arrival.name, '广州入境与取行李');
assert.equal(render(entity({ ...arrival, mapQuery: arrival.name })).links.length, 0,
  'The reported Day 18 non-location activity must not search maps for its activity name.');

for (const address of ['', '  ', '待确认', '地址待确认', '待核实', '地址未知', '待补充', '未提供', '不适用', 'Unknown', 'Pending', 'TBD', 'N/A', '—', 'Fixture arrival and luggage', 'CAN T2 → BAH → FCO T3', 'CDG T1 -> CAN T2']) {
  assert.equal(render(entity({ address })).links.length, 0, `Activity address is not one known location: ${address}`);
}
for (const coordinates of [{ lat: NaN, lng: 1 }, { lat: 1, lng: Infinity }, { lat: 91, lng: 1 }, { lat: 1, lng: -181 }]) {
  assert.equal(render(entity({ coordinates })).links.length, 0, 'Invalid coordinates cannot make an activity navigable.');
}
for (const [overrides, query] of [
  [{ address: '  12 Known Street, Rome  ' }, '12 Known Street, Rome'],
  [{ coordinates: { lat: 41.9, lng: 12.49 } }, '41.9,12.49'],
  [{ address: '12 Known Street, Rome', coordinates: { lat: 41.9, lng: 12.49 } }, '41.9,12.49'],
  [{ coordinates: { lat: 0, lng: 0 } }, '0,0'],
  [{ address: '12 Known Street, Rome', coordinates: { lat: NaN, lng: 12.49 } }, '12 Known Street, Rome'],
]) {
  const view = render(entity(overrides));
  assert.equal(view.links.length, 1, 'Activity with a real destination keeps navigation.');
  assert.equal(new URL(view.links[0].props.href).searchParams.get('query'), query);
  assert.equal(view.links[0].props.target, '_blank');
  assert.equal(view.links[0].props.rel, 'noreferrer');
}
for (const type of ['place', 'custom', 'restaurant', 'cafe', 'gym', 'hotel', 'shopping', 'photo_spot']) {
  for (const mapQuery of ['', 'Existing destination query']) {
    const value = entity({ type, mapQuery });
    const view = render(value);
    assert.equal(view.links.length, 1, `Existing navigation is preserved for ${type}.`);
    assert.equal(view.links[0].props.href, tripModel.mapLinks(value).google);
  }
}
const unknown = entity();
const newView = render(unknown, { selectedDay: 15 });
assert.deepEqual(newView.calls.placement, [[unknown.id, 15]]);
const add = nodes(newView.tree).find((node) => node.type === 'button' && /加入 Day 15/.test(textOf(node)));
assert.ok(add, 'Removing unknown-activity navigation must not remove add-to-chosen-day.');
add.props.onClick();
assert.deepEqual(newView.calls.add, [[unknown.id, 15, 'activeItems']]);
const target = nodes(newView.tree).find((node) => node.type === MobilePlanTarget);
assert.equal(target.props.selectedDay, 15);
target.props.selectDay(8);
assert.deepEqual(newView.calls.day, [[8]]);
assert.equal(newView.tree.type, MobileSheet);
newView.tree.props.close();
assert.equal(newView.calls.close, 1);

const backup = freeze({ dayId: 15, itemId: 'keep-backup-item-id', zone: 'backup' });
const backupView = render(unknown, { selectedDay: 15, placement: backup });
nodes(backupView.tree).find((node) => node.type === 'button' && /加入 Day 15/.test(textOf(node))).props.onClick();
assert.deepEqual(backupView.calls.transfer, [[15, 'keep-backup-item-id', 'alternatives', 'activeItems']]);
assert.deepEqual(backupView.calls.add, []);
const existingView = render(unknown, { selectedDay: 15, placement: { ...backup, zone: 'trip' } });
assert.equal(nodes(existingView.tree).filter((node) => node.type === 'button' && /加入 Day/.test(textOf(node))).length, 0);
assert.match(textOf(existingView.tree), /Day 15 已加入/);

const image = freeze({ file: '/fixture-cover.jpg', role: 'cover', title: 'Fixture image', caption: 'Fixture caption',
  source: null, sourcePage: null, lastVerified: null, isCover: true, priority: 0, entityId: unknown.id });
const pictured = entity({ images: [image] });
const picturedBefore = JSON.stringify(pictured);
const pictureView = render(pictured);
nodes(pictureView.tree).find((node) => node.type === 'button' && node.props.className === 'mobile-detail-image').props.onClick();
assert.equal(pictureView.calls.gallery.length, 1);
assert.equal(pictureView.calls.gallery[0].entityId, pictured.id);
assert.equal(pictureView.calls.gallery[0].images[0].file, image.file);
assert.equal(pictureView.calls.gallery[0].index, 0);
assert.equal(JSON.stringify(pictured), picturedBefore, 'Sheet rendering and handlers preserve entity facts.');
assert.equal(JSON.stringify(activityRows), sourceBefore);
assert.equal(render(null).tree, null);
const hotelAnchor = freeze({ id: 'fixture-hotel', name: 'Fixture Hotel', address: '1 Hotel Street',
  directionsUrl: 'https://www.google.com/maps/dir/?api=1&origin=1%20Hotel%20Street&destination=old%20activity%20name&travelmode=transit' });
for (const type of ['place', 'custom', 'restaurant', 'cafe', 'gym', 'hotel', 'shopping', 'photo_spot']) {
  const value = entity({ type, hotelAnchor });
  const links = navigationModel.navigationForEntity(value);
  assert.equal(links.google, tripModel.mapLinks(value).google);
  assert.equal(links.apple, tripModel.mapLinks(value).apple);
  assert.equal(links.fromHotel, hotelAnchor.directionsUrl, 'Ordinary entities retain the exact existing hotel route.');
}
assert.deepEqual(JSON.parse(JSON.stringify(navigationModel.navigationForEntity(entity({ hotelAnchor })))),
  { google: null, apple: null, fromHotel: null });
const activityWithLocation = entity({ address: '12 Known Street, Rome', hotelAnchor });
const hotelRoute = new URL(navigationModel.navigationForEntity(activityWithLocation).fromHotel);
assert.equal(hotelRoute.searchParams.get('origin'), '1 Hotel Street');
assert.equal(hotelRoute.searchParams.get('travelmode'), 'transit');
assert.equal(hotelRoute.searchParams.get('destination'), '12 Known Street, Rome');
assert.equal(navigationModel.navigationForEntity(entity({ address: '12 Known Street', hotelAnchor: { ...hotelAnchor, directionsUrl: 'invalid' } })).fromHotel, null);

function stateAdapter() {
  let slots = [];
  let cursor = 0;
  return {
    reset: (clear = false) => { cursor = 0; if (clear) slots = []; },
    useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
  };
}
const actualDays = JSON.parse(read('data/days.json'));
const icons = new Proxy({}, { get: () => () => null });
const sharedState = stateAdapter();
const shared = compile('views/shared/EntityUi.tsx', {
  react: sharedState, 'react/jsx-runtime': { jsx: element, jsxs: element },
  'next/image': { default: () => null }, 'lucide-react': icons,
  '@/lib/data': { guideData: { days: actualDays } }, '@/lib/media': media,
  '@/features/trip/tripModel': tripModel, '@/features/trip/entityNavigation': navigationModel,
});
const planState = stateAdapter();
const currentPlan = compile('views/trip/CurrentPlan.tsx', {
  react: planState, 'react/jsx-runtime': { jsx: element, jsxs: element }, 'lucide-react': icons,
  '@/lib/data': { guideData: { bookings: { items: [] }, days: actualDays } },
  '@/features/trip/tripModel': tripModel, '@/features/trip/entityNavigation': navigationModel,
  '@/views/shared/EntityUi': shared,
});
const DndContext = () => null;
const timeline = compile('views/trip/DesktopTripTimeline.tsx', {
  react: { useEffect: () => undefined, useRef: () => ({ current: null }) },
  'react/jsx-runtime': { jsx: element, jsxs: element }, 'next/image': { default: () => null }, 'lucide-react': icons,
  '@dnd-kit/core': { DndContext, KeyboardSensor: () => null, PointerSensor: () => null, closestCenter: () => null,
    useSensor: () => ({}), useSensors: () => [] },
  '@dnd-kit/sortable': { SortableContext: () => null, sortableKeyboardCoordinates: () => null, verticalListSortingStrategy: () => null,
    useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: () => undefined, transform: null, transition: null, isDragging: false }) },
  '@/features/trip/entityNavigation': navigationModel, '@/lib/media': media,
  '@/components/trip/TripStatusBadge': { StatusBadge: () => null },
});
const planItem = freeze({ id: 'keep-plan-item-id', entityId: unknown.id, time: '09:00', duration: '1h', order: 2, notes: 'Keep user notes', ticket: 'Core' });
const calls = { update: [], move: [], transfer: [], day: [], reorder: [], select: [], gallery: [], closed: 0 };
const actions = {
  updateItem: (...args) => calls.update.push(args), moveWithin: (...args) => calls.move.push(args),
  transfer: (...args) => calls.transfer.push(args), moveDay: (...args) => calls.day.push(args),
  reorderWithin: (...args) => calls.reorder.push(args), addEntity: (...args) => calls.transfer.push(args),
  placement: () => null,
};
const byText = (tree, label) => nodes(tree).find((node) => node.type === 'button' && textOf(node).trim() === label);
const navigationLinks = (tree) => nodes(tree).filter((node) => node.type === 'a' && /google\.com\/maps|maps\.apple\.com/.test(node.props.href));
const event = { stopPropagation: () => undefined };
const stopProps = (value) => ({ item: planItem, entity: value, dayId: 15, index: 1, total: 3, open: (request) => calls.gallery.push(request), actions, bookingStatuses: {} });
for (const [value, expectedCount] of [[unknown, 0], [activityWithLocation, 1], [entity({ type: 'place' }), 1]]) {
  planState.reset(true);
  assert.equal(navigationLinks(currentPlan.PlanStop(stopProps(value))).length, expectedCount);
  const tree = timeline.DesktopTripTimeline({ dayId: 15, rows: [{ item: planItem, entity: value, status: 'core', supportingLabel: 'Fixture support' }],
    route: { legs: [] }, selectedPointId: null, selectedLegId: null, selectPoint: (id) => calls.select.push(id), selectLeg: () => undefined, actions });
  const sortable = nodes(tree).find((node) => typeof node.type === 'function' && node.type.name === 'SortableStop');
  const row = sortable.type(sortable.props);
  assert.equal(navigationLinks(row).length, expectedCount);
  nodes(row).find((node) => node.type === 'input').props.onChange({ target: { value: '10:35' } });
  nodes(row).find((node) => node.props.className === 'workspace-stop-copy').props.onClick();
  nodes(row).find((node) => node.props['aria-label'] === `${value.name}下移`).props.onClick(event);
  nodes(tree).find((node) => node.type === DndContext).props.onDragEnd({ active: { id: planItem.id }, over: { id: 'target-item-id' } });
}
assert.equal(calls.update.at(-1)[0], 15);
assert.equal(calls.update.at(-1)[1], planItem.id);
assert.equal(calls.update.at(-1)[2].time, '10:35');
assert.deepEqual(calls.move.at(-1), [15, planItem.id, 1]);
assert.deepEqual(calls.reorder.at(-1), [15, planItem.id, 'target-item-id']);
planState.reset(true);
let planTree = currentPlan.PlanStop(stopProps(pictured));
nodes(planTree).find((node) => node.type === 'input').props.onChange({ target: { value: '11:00' } });
byText(planTree, '加入备选').props.onClick();
assert.deepEqual(calls.transfer.at(-1), [15, planItem.id, 'activeItems', 'alternatives']);
const mediaNode = nodes(planTree).find((node) => node.type === shared.Media);
nodes(shared.Media(mediaNode.props)).find((node) => node.type === 'button').props.onClick();
assert.equal(calls.gallery.at(-1).entityId, pictured.id);
assert.equal(calls.gallery.at(-1).images[0].file, image.file);
byText(planTree, '•••').props.onClick();
planState.reset();
planTree = currentPlan.PlanStop(stopProps(pictured));
nodes(planTree).find((node) => node.type === 'select').props.onChange({ target: { value: '8' } });
assert.deepEqual(calls.day.at(-1), [15, planItem.id, 8]);
byText(planTree, '移除').props.onClick();
assert.deepEqual(calls.transfer.at(-1), [15, planItem.id, 'activeItems', 'removedItems']);

const itemSheet = compile('components/mobile/MobilePlanItemSheet.tsx', {
  'react/jsx-runtime': { jsx: element, jsxs: element }, 'lucide-react': icons,
  '@/features/trip/entityNavigation': navigationModel, '@/components/mobile/MobileSheet': { MobileSheet },
});
for (const [value, count] of [[unknown, 0], [activityWithLocation, 1], [entity({ type: 'custom' }), 1]]) {
  const tree = itemSheet.MobilePlanItemSheet({ item: planItem, entity: value, index: 1, total: 3,
    close: () => { calls.closed += 1; }, controller: { selectedDay: 15, actions } });
  assert.equal(navigationLinks(tree).length, count);
  for (const label of ['提前一项', '推后一项', '移至当天备选', '移除安排']) byText(tree, label).props.onClick();
}
assert.equal(calls.closed, 12);
assert.deepEqual(calls.transfer.at(-1), [15, planItem.id, 'activeItems', 'removedItems']);
for (const [value, count] of [[entity({ hotelAnchor }), 0], [activityWithLocation, 3], [entity({ type: 'restaurant', hotelAnchor }), 3]]) {
  sharedState.reset(true);
  const tree = shared.EntityActions({ entity: value, selectedDay: 15, addEntity: actions.addEntity, transfer: actions.transfer, placement: actions.placement });
  assert.equal(navigationLinks(tree).length, count, 'Shared Discover actions gate Google/Apple/hotel navigation together.');
  byText(tree, '加入备选').props.onClick();
  assert.deepEqual(calls.transfer.at(-1), [value.id, 15, 'alternatives']);
}
sharedState.reset(true);
const backupTree = shared.EntityActions({ entity: unknown, selectedDay: 15, addEntity: actions.addEntity, transfer: actions.transfer, placement: () => backup });
byText(backupTree, '加入 Day 15').props.onClick();
assert.deepEqual(calls.transfer.at(-1), [15, backup.itemId, 'alternatives', 'activeItems']);
sharedState.reset(true);
let chosenTree = shared.EntityActions({ entity: unknown, selectedDay: 15, addEntity: actions.addEntity, transfer: actions.transfer, placement: actions.placement });
nodes(chosenTree).find((node) => node.type === 'select').props.onChange({ target: { value: '8' } });
sharedState.reset();
chosenTree = shared.EntityActions({ entity: unknown, selectedDay: 15, addEntity: actions.addEntity, transfer: actions.transfer, placement: actions.placement });
byText(chosenTree, '加入备选').props.onClick();
assert.deepEqual(calls.transfer.at(-1), [unknown.id, 8, 'alternatives']);

const discover = compile('views/discover/DiscoverView.tsx', {
  'react/jsx-runtime': { jsx: element, jsxs: element }, 'next/image': { default: () => null }, 'lucide-react': icons,
  '@/hooks/use-dialog-lifecycle': { useDialogLifecycle: () => ({ current: null }) }, '@/lib/media': media,
  '@/features/app/appModel': { cityNames: ['Fixture city'] },
  '@/features/trip/tripModel': { ...tripModel, hotelForCity: () => ({ hotelName: 'Fixture Hotel' }) },
  '@/features/trip/entityNavigation': navigationModel, '@/views/shared/EntityUi': shared,
  '@/features/discover/useDiscoverController': { useDiscoverController: ({ entities }) => ({ detailEntity: entities[0], setDetailEntity: () => undefined, shown: entities, picks: [], photos: [] }) },
});
for (const [value, count] of [[entity({ hotelAnchor }), 0], [activityWithLocation, 2], [entity({ type: 'restaurant', hotelAnchor }), 2]]) {
  const tree = discover.DiscoverView({ selectedDay: 15, entities: [value], actions, open: () => undefined, favorites: {}, setFavorites: () => undefined, tab: 'places', city: 'Fixture city' });
  const detail = nodes(tree).find((node) => typeof node.type === 'function' && node.type.name === 'EntityDetailModal');
  assert.equal(navigationLinks(detail.type(detail.props)).length, count, 'Discover detail gates map and hotel links with the same destination.');
  const card = nodes(tree).find((node) => typeof node.type === 'function' && node.type.name === 'ExploreCard');
  const cardTree = card.type(card.props);
  assert.equal(textOf(cardTree).includes('点击从酒店出发'), count > 0, 'Unknown activities must not advertise a hidden hotel route.');
  const entityActions = nodes(cardTree).find((node) => node.type === shared.EntityActions);
  assert.equal(entityActions.props.selectedDay, 15);
  assert.equal(entityActions.props.addEntity, actions.addEntity);
  assert.equal(entityActions.props.transfer, actions.transfer);
  assert.equal(entityActions.props.placement, actions.placement);
}
assert.equal(JSON.stringify(planItem), JSON.stringify({ id: 'keep-plan-item-id', entityId: unknown.id, time: '09:00', duration: '1h', order: 2, notes: 'Keep user notes', ticket: 'Core' }));
console.log('Entity navigation passed: actual helper and all navigation surfaces, non-location suppression, real destinations/unchanged ordinary hotel routes, chosen-day/edit/reorder/add/transfer/gallery preservation.');
