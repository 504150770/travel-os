import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const days = JSON.parse(read('data/days.json'));
const originalDays = JSON.stringify(days);
const element = (type, props, key) => ({ type, props: props ?? {}, key });
const component = (name) => Object.defineProperty(() => null, 'displayName', { value: name });
const components = Object.fromEntries([
  'ResizableHandle', 'ResizablePanel', 'ResizablePanelGroup', 'DesktopTripTimeline',
  'DesktopTripMap', 'DesktopTripOverview', 'DayDetailsDrawer', 'EntityDetailDrawer',
  'ExploreDrawer', 'GymDetailModal', 'QuickAdd', 'WeatherChip', 'DayStatusSummary',
].map((name) => [name, component(name)]));
const icons = new Proxy({}, { get: (_target, name) => component(String(name)) });

// Execute the actual component and controller handlers. Only rendering,
// browser APIs, unrelated panels, and already-tested presentation derivation
// are adapted. Storage stays in this VM's in-memory Map; no browser is opened.
function compile(file, imports, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read(file), {
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
    ...globals,
  }, { filename: `${file}.workbench.test.cjs` });
  return exports;
}

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
const plain = (value) => JSON.parse(JSON.stringify(value));
const byType = (tree, type) => nodes(tree).filter((node) => node.type === type);
function one(tree, type) {
  const found = byType(tree, type);
  assert.equal(found.length, 1, `Expected one ${type.displayName ?? type}`);
  return found[0];
}
function button(tree, label) {
  const found = nodes(tree).filter((node) => node.type === 'button' &&
    (node.props['aria-label'] === label || textOf(node).replace(/\s+/g, ' ').trim() === label));
  assert.equal(found.length, 1, `Expected one button: ${label}`);
  return found[0];
}
function content(tree) {
  const found = nodes(tree).find((node) => node.props.className === 'workspace-content-pane');
  assert.ok(found, 'The content pane remains mounted.');
  return found;
}
function mapStage(tree) {
  const found = nodes(tree).find((node) => node.props.className === 'workspace-map-stage');
  assert.ok(found, 'Explicitly opened map retains its wrapper.');
  return found;
}

const place = (id, lat) => ({
  id, name: id, type: 'place', city: days[0].city, description: '', notes: '', images: [],
  coordinates: { lat, lng: 12.49 }, raw: {},
});
const stopA = place('workbench-stop-a', 41.89);
const stopB = place('workbench-stop-b', 41.9);
const candidate = place('workbench-candidate', 41.91);
const gym = { ...place('workbench-gym', 41.92), type: 'gym', raw: { recommendedDays: [days[0].day] } };
const entities = [stopA, stopB, candidate, gym];
const plans = days.map((day) => ({
  dayId: day.day,
  activeItems: [stopA, stopB].map((entity, index) => ({
    id: `workbench-d${day.day}-${index}`, entityId: entity.id, order: index + 1,
    time: '09:00', duration: '1h', notes: '', ticket: '',
  })), alternatives: [], removedItems: [],
}));
const routes = days.map(() => ({
  legs: [{ id: 'workbench-leg', fromId: stopA.id, toId: stopB.id, recommendedMode: 'Walk',
    recommended: '步行', status: 'known', walkMin: 10, distanceKm: 0.7 }],
  summary: { walkingKm: 0.7 }, atGlance: { meal: '现场选择' },
}));

function mount({ compact = true, selectedDay = days[0].day, savedWidth } = {}) {
  let cursor = 0;
  const slots = [];
  const writes = [];
  const changes = [];
  const additions = [];
  const storage = new Map(savedWidth === undefined ? [] : [['travel.desktop.tripPanelWidth', String(savedWidth)]]);
  const document = { documentElement: { dataset: {} }, addEventListener: () => undefined, removeEventListener: () => undefined };
  let locationRequests = 0;
  let locationStatus = 'idle';
  const window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => { storage.set(key, value); writes.push({ key, value }); },
    },
    matchMedia: () => ({ matches: compact, addEventListener: () => undefined, removeEventListener: () => undefined }),
    requestAnimationFrame: (callback) => callback(),
  };
  const react = {
    useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    },
    useRef: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useMemo: (factory) => factory(), useCallback: (callback) => callback,
    useEffect: () => undefined, useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
  };
  const resolve = (id) => entities.find((entity) => entity.id === id);
  const tripModel = {
    dayRoutes: routes, realStays: [], hotelForNight: () => undefined,
    routeCityForDay: (day) => day.city,
  };
  const controller = compile('features/trip/useTripController.ts', {
    react, '@/lib/data': { guideData: { days, images: [] } },
    '@/lib/entity-library': { normalizeRouteCity: (city) => city },
    '@/features/trip/tripModel': tripModel,
    '@/lib/derive-current-day': {
      deriveCurrentDayState: ({ planDay, staticRoute }) => ({
        activeEntities: planDay.activeItems.map((item) => resolve(item.entityId)), route: staticRoute,
      }),
    },
  });
  const mapSelectors = compile('features/map/mapSelectors.ts', {
    '@/lib/entity-library': { normalizeRouteCity: (city) => city },
  });
  const workspace = compile('views/trip/DesktopTripWorkspace.tsx', {
    react, 'react/jsx-runtime': { jsx: element, jsxs: element }, 'lucide-react': icons,
    '@/lib/data': { guideData: { days } }, '@/features/trip/tripModel': tripModel,
    '@/features/trip/useTripController': controller,
    '@/features/map/mapSelectors': mapSelectors,
    '@/components/ui/resizable': components,
    '@/views/trip/DesktopTripTimeline': components,
    '@/views/trip/DesktopTripMap': components, '@/views/trip/DesktopTripOverview': components,
    '@/views/trip/DesktopTripDrawers': components, '@/views/trip/DayGym': components,
    '@/views/trip/QuickAdd': components, '@/views/trip/desktop-workspace.css': {},
    '@/features/map/location/useCurrentLocation': {
      useCurrentLocation: () => ({
        state: { status: locationStatus, position: null }, focusToken: 0,
        request: () => { locationRequests += 1; },
      }),
    },
    '@/features/weather/useWeatherContext': { useWeatherContext: () => ({ status: 'idle' }) },
    '@/components/weather/WeatherChip': components,
    '@/features/readiness/readinessModel': { actionForDay: () => undefined },
    '@/features/trip/tripPresentationModel': {
      buildPlanPresentation: (planDay) => planDay.activeItems.map((item) => ({
        item, entity: resolve(item.entityId), status: 'core', supportingLabel: '',
      })),
      countPlanStatuses: () => ({ fixed: 0, 'to-book': 0, core: 2, flex: 0 }),
      buildTodaysTips: () => [],
    },
    '@/components/trip/TripStatusBadge': components,
  }, { window, document, performance: { now: () => 10 }, Intl });
  const actions = {
    plan: { days: plans }, addEntity: (...args) => additions.push(args),
  };
  const render = () => {
    cursor = 0;
    return workspace.default({
      selectedDay, setSelectedDay: (day) => { changes.push(day); selectedDay = day; },
      resolve, entities, actions, open: () => undefined, clock: null, addCustom: () => undefined,
      preferredTransport: {}, bookingStatuses: {}, actionStatuses: {}, privateLinks: {}, actionQueue: [],
    });
  };
  return {
    render, writes, storage, changes, additions, dataset: document.documentElement.dataset,
    setCompact: (value) => { compact = value; },
    setLocationStatus: (value) => { locationStatus = value; },
    locationRequests: () => locationRequests,
  };
}

const narrow = mount();
let tree = narrow.render();
assert.equal(byType(tree, components.DesktopTripTimeline).length, 0, 'Compact starts with unobstructed overview.');
assert.equal(content(tree).props.hidden, false);
assert.equal(byType(tree, components.DesktopTripMap).length, 0, 'Overview must not mount a map.');
button(tree, '行程').props.onClick();
tree = narrow.render();
assert.equal(byType(tree, components.DesktopTripTimeline).length, 1);
assert.equal(content(tree).props.hidden, true, 'Opening compact plan hides, rather than removes, content.');
assert.equal(byType(tree, components.DesktopTripOverview).length, 1);
button(tree, '返回概览').props.onClick();
tree = narrow.render();
assert.equal(content(tree).props.hidden, false);
assert.equal(byType(tree, components.DesktopTripTimeline).length, 0);
button(tree, '行程').props.onClick();
button(narrow.render(), '收起行程').props.onClick();
assert.equal(byType(narrow.render(), components.DesktopTripTimeline).length, 0);

button(narrow.render(), '行程').props.onClick();
button(narrow.render(), '地图').props.onClick();
tree = narrow.render();
const firstMap = one(tree, components.DesktopTripMap);
assert.equal(byType(tree, components.DesktopTripTimeline).length, 0, 'View switch closes compact plan.');
assert.equal(firstMap.props.active, true);
assert.equal(firstMap.props.interactive, true);
assert.equal(mapStage(tree).props.hidden, false);
assert.equal(narrow.locationRequests(), 0, 'Opening map never requests geolocation.');
button(tree, '行程').props.onClick();
tree = narrow.render();
assert.equal(one(tree, components.DesktopTripMap).type, firstMap.type);
assert.equal(one(tree, components.DesktopTripMap).key, firstMap.key);
button(tree, '返回地图').props.onClick();
tree = narrow.render();
assert.equal(content(tree).props.hidden, false);
assert.equal(one(tree, components.DesktopTripMap).props.active, true);
button(tree, '概览').props.onClick();
tree = narrow.render();
assert.equal(one(tree, components.DesktopTripMap).type, firstMap.type);
assert.equal(one(tree, components.DesktopTripMap).key, firstMap.key);
assert.equal(one(tree, components.DesktopTripMap).props.active, false);
assert.equal(mapStage(tree).props.hidden, true, 'Overview retains the map component at its stable JSX position.');
button(tree, '地图').props.onClick();
assert.equal(one(narrow.render(), components.DesktopTripMap).props.active, true);
button(narrow.render(), '行程').props.onClick();
button(narrow.render(), '概览').props.onClick();
tree = narrow.render();
assert.equal(byType(tree, components.DesktopTripTimeline).length, 0, 'Overview switch also closes compact plan.');
assert.equal(content(tree).props.hidden, false);
button(tree, '地图').props.onClick();
tree = narrow.render();
const fitBefore = one(tree, components.DesktopTripMap).props.fitToken;
button(tree, '全部地点').props.onClick();
assert.notEqual(one(narrow.render(), components.DesktopTripMap).props.fitToken, fitBefore);
button(narrow.render(), '路线').props.onClick();
assert.equal(one(narrow.render(), components.DesktopTripMap).props.showRoute, false);
button(narrow.render(), '路线').props.onClick();
assert.equal(one(narrow.render(), components.DesktopTripMap).props.showRoute, true);

// Invoke real drawer/controller handlers, then inspect the map's interaction gate.
button(narrow.render(), '当天详情').props.onClick();
tree = narrow.render();
assert.equal(one(tree, components.DayDetailsDrawer).props.open, true);
assert.equal(one(tree, components.DesktopTripMap).props.interactive, false);
one(tree, components.DayDetailsDrawer).props.openGym(gym);
one(tree, components.DayDetailsDrawer).props.close();
tree = narrow.render();
assert.equal(one(tree, components.DesktopTripMap).props.interactive, false, 'Gym modal blocks map after drawer closes.');
one(tree, components.GymDetailModal).props.close();
assert.equal(one(narrow.render(), components.DesktopTripMap).props.interactive, true);
button(narrow.render(), '查找地点').props.onClick();
tree = narrow.render();
const explore = one(tree, components.ExploreDrawer);
assert.equal(explore.props.open, true);
explore.props.onCandidates([stopA, candidate]);
tree = narrow.render();
assert.ok(one(tree, components.DesktopTripMap).props.points.some((point) => point.id === candidate.id));
assert.equal(one(tree, components.DesktopTripMap).props.points.filter((point) => point.id === stopA.id).length, 1, 'Existing stops are not duplicated as candidates.');
one(tree, components.ExploreDrawer).props.onAdd(candidate);
assert.deepEqual(plain(narrow.additions.at(-1)), [candidate.id, days[0].day, 'activeItems']);
one(narrow.render(), components.ExploreDrawer).props.inspect(candidate);
tree = narrow.render();
assert.equal(one(tree, components.EntityDetailDrawer).props.entity.id, candidate.id);
assert.equal(one(tree, components.DesktopTripMap).props.interactive, false);
one(tree, components.EntityDetailDrawer).props.close();
tree = narrow.render();
assert.equal(one(tree, components.DesktopTripMap).props.interactive, true);
button(tree, '查找地点').props.onClick();
one(narrow.render(), components.ExploreDrawer).props.openCustom();
one(narrow.render(), components.ExploreDrawer).props.close();
tree = narrow.render();
assert.equal(one(tree, components.DesktopTripMap).props.interactive, false, 'Quick Add blocks map after drawer closes.');
one(tree, components.QuickAdd).props.close();
assert.equal(one(narrow.render(), components.DesktopTripMap).props.interactive, true);

// Shared selection resets must happen in the actual day-navigation handler.
button(narrow.render(), '行程').props.onClick();
one(narrow.render(), components.DesktopTripTimeline).props.selectLeg('workbench-leg');
one(narrow.render(), components.DesktopTripTimeline).props.selectPoint(stopA.id);
assert.equal(one(narrow.render(), components.DesktopTripMap).props.selectedLegId, null, 'Selecting a point clears the prior route-leg selection.');
one(narrow.render(), components.DesktopTripTimeline).props.selectLeg('workbench-leg');
button(narrow.render(), '查找地点').props.onClick();
one(narrow.render(), components.ExploreDrawer).props.onCandidates([candidate]);
tree = narrow.render();
assert.equal(one(tree, components.DesktopTripMap).props.selectedPointId, stopA.id);
assert.equal(one(tree, components.DesktopTripMap).props.selectedLegId, 'workbench-leg');
assert.ok(one(tree, components.DesktopTripMap).props.points.some((point) => point.id === candidate.id));
button(tree, '下一天').props.onClick();
tree = narrow.render();
assert.equal(one(tree, components.DesktopTripMap).props.selectedPointId, null);
assert.equal(one(tree, components.DesktopTripMap).props.selectedLegId, null);
assert.equal(one(tree, components.DesktopTripMap).props.points.some((point) => point.id === candidate.id), false);
assert.deepEqual(narrow.changes, [days[1].day]);
assert.match(one(tree, components.DesktopTripMap).props.fitToken, new RegExp(`^${days[1].day}:`));

for (const [day, unavailable, available, next] of [
  [days[0].day, '上一天', '下一天', days[1].day],
  [days.at(-1).day, '下一天', '上一天', days.at(-2).day],
]) {
  const edge = mount({ selectedDay: day });
  const edgeTree = edge.render();
  assert.equal(button(edgeTree, unavailable).props.disabled, true);
  button(edgeTree, unavailable).props.onClick();
  assert.equal(edge.changes.length, 0, 'Direct invocation of disabled day handler cannot leave guideData bounds.');
  button(edge.render(), available).props.onClick();
  assert.deepEqual(edge.changes, [next]);
}

// Wide-panel mutations use an in-memory imperative panel and storage adapter.
const wide = mount({ compact: false });
tree = wide.render();
let planPanel = byType(tree, components.ResizablePanel).find((node) => node.props.id === 'plan');
assert.ok(planPanel);
const panelDefaults = { width: planPanel.props.defaultSize, min: planPanel.props.minSize, max: planPanel.props.maxSize };
let collapsed = false;
planPanel.props.panelRef.current = {
  isCollapsed: () => collapsed, collapse: () => { collapsed = true; }, expand: () => { collapsed = false; },
};
button(tree, '收起行程').props.onClick();
assert.equal(collapsed, true);
tree = wide.render();
wide.setCompact(true);
assert.equal(byType(wide.render(), components.DesktopTripTimeline).length, 0, 'Wide collapse does not open compact plan.');
button(wide.render(), '行程').props.onClick();
assert.equal(byType(wide.render(), components.DesktopTripTimeline).length, 1);
wide.setCompact(false);
tree = wide.render();
const toolbar = nodes(tree).find((node) => node.props.className === 'workspace-toolbar');
button(toolbar, '行程').props.onClick();
assert.equal(collapsed, false, 'Wide panel uses imperative expand regardless of compact state.');
tree = wide.render();
planPanel = byType(tree, components.ResizablePanel).find((node) => node.props.id === 'plan');
const resizeWidth = Number.parseInt(panelDefaults.min, 10) + 20;
planPanel.props.onResize({ inPixels: resizeWidth });
assert.equal(wide.storage.get('travel.desktop.tripPanelWidth'), String(resizeWidth));
const written = wide.writes.length;
planPanel.props.onResize({ inPixels: 0 });
assert.equal(wide.writes.length, written, 'Collapsed size does not replace the saved usable width.');
tree = wide.render();
const beforeReset = one(tree, components.ResizablePanelGroup).key;
one(tree, components.ResizableHandle).props.onDoubleClick();
tree = wide.render();
assert.notEqual(one(tree, components.ResizablePanelGroup).key, beforeReset, 'Reset remounts the resizable group at its default width.');
planPanel = byType(tree, components.ResizablePanel).find((node) => node.props.id === 'plan');
assert.equal(planPanel.props.defaultSize, panelDefaults.width);
assert.equal(wide.storage.get('travel.desktop.tripPanelWidth'), String(Number.parseInt(panelDefaults.width, 10)));

for (const [savedWidth, expected] of [
  [-100, panelDefaults.min], [99999, panelDefaults.max], ['not-a-width', panelDefaults.width],
]) {
  const fixture = mount({ compact: false, savedWidth });
  const savedPanel = byType(fixture.render(), components.ResizablePanel).find((node) => node.props.id === 'plan');
  assert.equal(savedPanel.props.defaultSize, expected, 'Saved panel width is clamped or safely falls back.');
  assert.equal(fixture.writes.length, 0, 'Rendering does not rewrite saved width.');
}
assert.equal(narrow.locationRequests(), 0);
assert.equal(narrow.writes.length, 0, 'Compact navigation does not persist wide-panel state.');
assert.equal(JSON.stringify(days), originalDays, 'Component checks must not mutate trip facts.');
console.log('Desktop workbench tests passed: actual compact/day/drawer/map/panel handlers, persistent lazy-map JSX, and in-memory panel persistence. Browser layout, focus and real map instance reuse still require visual QA.');
