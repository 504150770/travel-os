import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { legCoordinatePair, routeCoordinateOrder } from '../features/map/mapModel.ts';
import { removeEntityFromPlan, reorderPlanItems } from '../features/trip/planModel.ts';

const route = {
  legs: [
    { id: 'leg-1', fromId: 'hotel', toId: 'stop-a' },
    { id: 'leg-2', fromId: 'stop-a', toId: 'stop-b' },
    { id: 'leg-3', fromId: 'stop-b', toId: 'hotel' },
  ],
};
const points = [
  { id: 'hotel', kind: 'hotel', name: 'Hotel', lat: 41.9, lng: 12.49 },
  { id: 'stop-a', kind: 'stop', name: 'First stop', lat: 41.89, lng: 12.49 },
  { id: 'stop-b', kind: 'stop', name: 'Second stop', lat: 41.9, lng: 12.48 },
];

assert.deepEqual(routeCoordinateOrder(route, points), [
  [41.9, 12.49],
  [41.89, 12.49],
  [41.9, 12.48],
  [41.9, 12.49],
]);
assert.deepEqual(legCoordinatePair(route, points, 'leg-2'), [
  [41.89, 12.49],
  [41.9, 12.48],
]);
assert.deepEqual(legCoordinatePair(route, points, null), []);

const reordered = reorderPlanItems(
  [
    { id: 'a', order: 1, entityId: 'stop-a' },
    { id: 'b', order: 2, entityId: 'stop-b' },
    { id: 'c', order: 3, entityId: 'stop-c' },
  ],
  'c',
  'a',
);
assert.deepEqual(reordered.map(({ id, order }) => ({ id, order })), [
  { id: 'c', order: 1 },
  { id: 'a', order: 2 },
  { id: 'b', order: 3 },
]);

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const deletionPlan = JSON.parse(read('data/day-plans.json'));
const originalDeletionPlan = JSON.stringify(deletionPlan);
const temporaryItem = { ...deletionPlan.days[0].activeItems[0], id: 'qa-custom', entityId: 'qa-custom', order: 1 };
for (const [index, zone] of [[0, 'activeItems'], [1, 'alternatives'], [2, 'removedItems']]) {
  deletionPlan.days[index][zone] = [temporaryItem, ...(deletionPlan.days[index][zone] ?? [])];
}
const beforeDeletion = JSON.stringify(deletionPlan);
const cleaned = removeEntityFromPlan(deletionPlan, 'qa-custom');
assert.equal(JSON.stringify(deletionPlan), beforeDeletion, 'deletion must not mutate the source plan');
assert.equal(cleaned.days.flatMap(day => [...day.activeItems, ...day.alternatives, ...(day.removedItems ?? [])]).some(item => item.entityId === 'qa-custom'), false);
for (const [index, zone] of [[0, 'activeItems'], [1, 'alternatives'], [2, 'removedItems']]) {
  assert.deepEqual(cleaned.days[index][zone].map(item => item.order), cleaned.days[index][zone].map((_, position) => position + 1));
}
assert.equal(cleaned.days[3], deletionPlan.days[3], 'unaffected days retain their original fields and order');
assert.deepEqual(removeEntityFromPlan(JSON.parse(originalDeletionPlan), 'absent'), JSON.parse(originalDeletionPlan));
const tripView = read('views/trip/TripView.tsx');
const workspace = read('views/trip/DesktopTripWorkspace.tsx');
const timeline = read('views/trip/DesktopTripTimeline.tsx');
const desktopMap = read('views/trip/DesktopTripMap.tsx');
const mobileMap = read('components/mobile/map/MobileMapCanvas.tsx');
const sharedMap = read('components/map/MapCanvas.tsx');
const mapSelectors = read('features/map/mapSelectors.ts');
const editablePlan = read('hooks/use-editable-plan.ts');
const guide = read('components/travel-guide-v3.tsx');
const mapLoader = read('features/map/mapLoader.ts');

assert.match(tripView, /lazy\(loadDesktopTripWorkspace\)/);
assert.match(tripView, /preloadTripWorkspace/);
assert.doesNotMatch(tripView, /preloadMapCanvas/);
assert.match(desktopMap, /lazy\(loadMapCanvas\)/);
assert.match(mapLoader, /travel-map-import/);
assert.match(guide, /PersistentTripView/);
assert.match(tripView, /active \|\| visited/);
assert.match(tripView, /hidden=\{!active\}/);
assert.match(mobileMap, /from '@\/components\/map\/MapCanvas'/);
assert.match(sharedMap, /from 'leaflet'/);
assert.match(sharedMap, /onMapStage/);
assert.match(desktopMap, /workspace-map-progress/);
assert.match(workspace, /travel\.desktop\.tripPanelWidth/);
// Source wiring guards; actual Escape/outside-click behavior is checked in Chrome.
assert.match(workspace, /document\.addEventListener\('pointerdown', dismissOutside\)/);
assert.match(workspace, /document\.removeEventListener\('pointerdown', dismissOutside\)/);
assert.match(workspace, /document\.addEventListener\('focusin', dismissOutside\)/);
assert.match(workspace, /document\.removeEventListener\('focusin', dismissOutside\)/);
assert.match(workspace, /document\.removeEventListener\('keydown', dismissEscape\)/);
assert.match(workspace, /targetDialog && !dayNavRef\.current\?\.contains\(targetDialog\)/);
assert.match(workspace, /dayButtonRef\.current\?\.focus\(\)/);
assert.match(workspace, /selectedPointId/);
assert.match(workspace, /selectedPointId=\{selectedPointId\}/);
assert.ok((workspace.match(/selectPoint=\{selectPoint\}/g) ?? []).length >= 2);
assert.match(workspace, /setSelectedPointId\(null\)[\s\S]*trip\.changeDay\(day\)/);
assert.match(workspace, /drawer === 'explore'/);
assert.match(workspace, /drawer === 'entity'/);
assert.match(workspace, /actions\.addEntity\(entity\.id, selectedDay, 'activeItems'\)/);
assert.match(workspace, /onDoubleClick=\{resetPanel\}/);
assert.match(workspace, /minSize=\{`\$\{MIN_PANEL\}px`\}/);
assert.match(workspace, /maxSize=\{`\$\{MAX_PANEL\}px`\}/);
assert.match(timeline, /DndContext/);
assert.match(timeline, /SortableContext/);
assert.match(editablePlan, /reorderWithin/);
assert.match(editablePlan, /reorderPlanItems/);
assert.match(editablePlan, /commit\(/);
// Permanent custom deletion must not expose a plan-only Undo that restores orphan references.
const deleteEntitySource = editablePlan.slice(editablePlan.indexOf('const deleteEntity ='), editablePlan.indexOf('const undoLast ='));
assert.match(deleteEntitySource, /setUndo\(null\)/);
assert.match(deleteEntitySource, /removeEntityFromPlan\(plan, entityId\)/);
assert.doesNotMatch(deleteEntitySource, /commit\(/);
const moveDaySource = editablePlan.slice(editablePlan.indexOf('const moveDay ='), editablePlan.indexOf('const addEntity ='));
assert.match(moveDaySource, /day\.activeItems\.filter\(\(row\) => row\.entityId !== item\.entityId\)/);
assert.match(moveDaySource, /day\.alternatives\.filter\(\(row\) => row\.entityId !== item\.entityId\)/);
assert.match(moveDaySource, /day\.removedItems \?\? \[\]\)\.filter\(\(row\) => row\.entityId !== item\.entityId\)/);
assert.match(mapSelectors, /let stopOrder = 0/);
assert.match(mapSelectors, /stopOrder \+= 1/);
assert.match(mapSelectors, /order: stopOrder/);

console.log(
  'Desktop workspace tests passed: on-demand persistent map, shared selection wiring, persisted panel, route geometry, and DnD reorder model.',
);
