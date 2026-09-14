import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { legCoordinatePair, routeCoordinateOrder } from '../features/map/mapModel.ts';
import { reorderPlanItems } from '../features/trip/planModel.ts';

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
assert.match(workspace, /selectedPointId/);
assert.match(workspace, /selectedPointId=\{selectedPointId\}/);
assert.ok((workspace.match(/selectPoint=\{selectPoint\}/g) ?? []).length >= 3);
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
assert.match(mapSelectors, /planDay\.activeItems\.forEach\(\(item, index\)/);
assert.match(mapSelectors, /order: index \+ 1/);

console.log(
  'Desktop workspace tests passed: progressive/preloaded persistent map, shared selection wiring, persisted panel, route geometry, and DnD reorder model.',
);
