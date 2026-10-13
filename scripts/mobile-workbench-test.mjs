import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise real component JSX and handlers with an isolated React state adapter.
// All entities, plans, weather and presentation values below are synthetic and
// remain in memory. No browser, local/session storage or travel data is accessed.
const element = (type, props, key) => ({ type, props: props ?? {}, key });
const jsxRuntime = { jsx: element, jsxs: element, Fragment: Symbol('Fragment') };
const Image = () => null;
const MobileEntitySheet = () => null;
const WeatherChip = () => null;
const DayStatusSummary = () => null;
const StatusBadge = () => null;
const TodaysTipsCard = () => null;
const icons = Object.fromEntries([
  'BedDouble', 'CalendarDays', 'Camera', 'Check', 'ChevronRight', 'Clock3',
  'Dumbbell', 'Heart', 'MapPin', 'MoreHorizontal', 'Navigation', 'Plus',
  'Route', 'Search', 'TicketCheck', 'Utensils', 'X',
].map((name) => [name, () => null]));

function reactAdapter() {
  const slots = [];
  let cursor = 0;
  return {
    beginRender: () => { cursor = 0; },
    react: {
      useMemo: (factory) => factory(),
      useState(initialValue) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = typeof initialValue === 'function' ? initialValue() : initialValue;
        return [slots[index], (value) => {
          slots[index] = typeof value === 'function' ? value(slots[index]) : value;
        }];
      },
    },
  };
}

function loadComponent(relativePath, imports, adapter = reactAdapter()) {
  const source = fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    },
  }).outputText;
  const dependencies = { 'react/jsx-runtime': jsxRuntime, react: adapter.react, ...imports };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency in ${relativePath}: ${name}`);
      return dependencies[name];
    },
  }, { filename: `${relativePath}.isolated-test.cjs` });
  return {
    exports,
    render: (name, props) => {
      adapter.beginRender();
      return exports[name](props);
    },
  };
}

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
const hasClass = (node, className) => typeof node.props?.className === 'string' && node.props.className.split(/\s+/).includes(className);
function findNode(tree, predicate, message) {
  const result = nodes(tree).find(predicate);
  assert.ok(result, message);
  return result;
}
const classNode = (tree, className) => findNode(tree, (node) => hasClass(node, className), `Missing ${className}`);
const buttonByText = (tree, pattern) => findNode(tree, (node) => node.type === 'button' && pattern.test(textOf(node)), `Missing button ${pattern}`);
const normalizeText = (tree) => textOf(tree).replace(/\s+/g, ' ').trim();
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
const entity = (id, overrides = {}) => ({
  id, name: id, type: 'place', city: '罗马', description: `Description for ${id}`,
  notes: '', tags: [], images: [{ file: `/fixture-${id}.jpg`, title: `Fixture ${id}` }],
  priceLabel: 'Fixture price', raw: {}, ...overrides,
});
const planItem = (id, entityId, overrides = {}) => ({
  id, entityId, order: 1, time: '09:15', duration: '40分钟', status: 'planned',
  notes: `Keep ${id} notes`, guard: `Keep ${id} guard`, ticket: `Keep ${id} ticket`,
  ...overrides,
});
const fixtureDays = deepFreeze([
  { day: 1, city: '罗马', date: '2030-01-01', theme: 'Fixture day one' },
  { day: 2, city: '罗马', date: '2030-01-02', theme: 'Fixture day two' },
  { day: 3, city: '巴黎', date: '2030-01-03', theme: 'Fixture day three' },
]);
const media = { selectCoverImage: (images) => images[0] };
const tripModel = {
  routeCityForDay: (day) => day.city,
  mapLinks: (value) => ({ google: `https://example.test/map/${value.id}` }),
};
const planTargetModule = loadComponent('components/mobile/MobilePlanTarget.tsx', {
  '@/lib/data': { guideData: { days: fixtureDays } },
  '@/features/trip/tripModel': tripModel,
  '@/components/mobile/mobile-explore.css': {},
});
const MobilePlanTarget = planTargetModule.exports.MobilePlanTarget;
const overviewCopyModule = loadComponent('features/trip/overviewCopy.ts', {});

const exploreEntities = deepFreeze([
  entity('place-new', { name: 'ALPHA Gallery', description: 'A quiet archway', tags: ['Heritage'] }),
  entity('place-trip', { name: 'Ticketed Plaza' }),
  entity('place-backup', { name: 'Backup Garden' }),
  entity('place-away', { name: 'Elsewhere Museum' }),
  entity('food-cafe', { name: 'Fixture Cafe', type: 'cafe' }),
  entity('gym-room', { name: 'Fixture Gym', type: 'gym' }),
  entity('shop-room', { name: 'Fixture Shop', type: 'shopping' }),
  entity('paris-place', { name: 'Fixture Paris Place', city: '巴黎' }),
]);
const exploreFixturesBefore = JSON.stringify(exploreEntities);
const exploreModule = loadComponent('components/mobile/MobileExplore.tsx', {
  'next/image': { __esModule: true, default: Image },
  'lucide-react': icons,
  '@/lib/entity-library': { normalizeRouteCity: (city) => city },
  '@/features/app/appModel': { cityNames: ['罗马', '巴黎'] },
  '@/lib/media': media,
  '@/features/trip/overviewCopy': overviewCopyModule.exports,
  '@/components/mobile/MobileEntitySheet': { MobileEntitySheet },
  '@/components/mobile/MobilePlanTarget': { MobilePlanTarget },
});
const exploreCalls = { placement: [], transfer: [], add: [], favorites: [], day: [], category: [], city: [] };
const placements = new Map([
  ['2:place-trip', { dayId: 2, itemId: 'keep-trip-item', zone: 'trip' }],
  ['2:place-backup', { dayId: 2, itemId: 'keep-backup-item', zone: 'backup' }],
  ['1:place-away', { dayId: 1, itemId: 'other-day-item', zone: 'backup' }],
]);
const exploreController = {
  selectedDay: 2, discoverTab: 'places', discoverCity: '罗马',
  entities: exploreEntities, favorites: { 'unrelated-favorite': true },
  actions: {
    plan: { days: fixtureDays.map((day) => ({ dayId: day.day, activeItems: [], alternatives: [] })) },
    placement: (id, day) => {
      exploreCalls.placement.push([id, day]);
      return placements.get(`${day}:${id}`) ?? null;
    },
    transfer: (...args) => exploreCalls.transfer.push(args),
    addEntity: (...args) => exploreCalls.add.push(args),
  },
  setFavorites: (value) => { exploreController.favorites = value; exploreCalls.favorites.push(value); },
  selectMobileDay: (day) => { exploreController.selectedDay = day; exploreCalls.day.push(day); },
  selectMobileDiscoverTab: (tab) => { exploreController.discoverTab = tab; exploreCalls.category.push(tab); },
  selectMobileDiscoverCity: (city) => { exploreController.discoverCity = city; exploreCalls.city.push(city); },
  selectTripDay: () => assert.fail('Explore must use the mobile day callback that preserves its URL context.'),
  selectDiscoverTab: () => assert.fail('Explore must use the mobile category callback.'),
  selectDiscoverCity: () => assert.fail('Explore must use the mobile city callback.'),
};
const renderExplore = () => exploreModule.render('MobileExplore', { controller: exploreController });
const card = (tree, id) => findNode(tree, (node) => node.type === 'article' && node.key === id, `Missing Explore card ${id}`);
const cardIds = (tree) => nodes(classNode(tree, 'mobile-explore-grid')).filter((node) => node.type === 'article').map((node) => node.key).sort();
const searchInput = (tree) => findNode(tree, (node) => node.type === 'input', 'Missing search input');
const detailSheet = (tree) => findNode(tree, (node) => node.type === MobileEntitySheet, 'Missing detail sheet wiring');
function chooseTargetDay(tree, day) {
  const target = findNode(tree, (node) => node.type === MobilePlanTarget, 'Missing target day selector');
  assert.equal(target.props.selectedDay, exploreController.selectedDay);
  assert.equal(target.props.selectDay, exploreController.selectMobileDay);
  const actualTarget = MobilePlanTarget(target.props);
  const select = findNode(actualTarget, (node) => node.type === 'select', 'Missing actual target select');
  assert.equal(select.props.value, exploreController.selectedDay);
  select.props.onChange({ target: { value: String(day) } });
}

let exploreTree = renderExplore();
assert.deepEqual(cardIds(exploreTree), ['place-away', 'place-backup', 'place-new', 'place-trip']);
for (const term of [' ALPHA ', 'archway', 'hErItAgE']) {
  searchInput(exploreTree).props.onChange({ target: { value: term } });
  exploreTree = renderExplore();
  assert.deepEqual(cardIds(exploreTree), ['place-new'], `Search must include name, description and tags: ${term}`);
}
searchInput(exploreTree).props.onChange({ target: { value: 'no fixture matches' } });
exploreTree = renderExplore();
assert.deepEqual(cardIds(exploreTree), []);
assert.ok(classNode(exploreTree, 'mobile-explore-empty'));
classNode(exploreTree, 'mobile-search-clear').props.onClick();
exploreTree = renderExplore();
assert.equal(searchInput(exploreTree).props.value, '');
assert.equal(cardIds(exploreTree).length, 4);

for (const [label, tab, expected] of [
  ['美食', 'food', ['food-cafe']], ['健身', 'gym', ['gym-room']],
  ['购物', 'shopping', ['shop-room']],
]) {
  buttonByText(classNode(exploreTree, 'mobile-filter-row'), new RegExp(`^${String(label)}$`)).props.onClick();
  exploreTree = renderExplore();
  assert.equal(exploreCalls.category.at(-1), tab);
  assert.deepEqual(cardIds(exploreTree), expected);
  assert.equal(exploreController.selectedDay, 2, 'Category changes retain the target day.');
}
buttonByText(classNode(exploreTree, 'mobile-filter-row'), /^地点与活动$/).props.onClick();
exploreTree = renderExplore();
classNode(exploreTree, 'mobile-city-select').props.onChange({ target: { value: '巴黎' } });
exploreTree = renderExplore();
assert.equal(exploreCalls.city.at(-1), '巴黎');
assert.deepEqual(cardIds(exploreTree), ['paris-place']);
assert.equal(exploreController.selectedDay, 2, 'City changes retain the target day.');
classNode(exploreTree, 'mobile-city-select').props.onChange({ target: { value: '罗马' } });
exploreTree = renderExplore();
chooseTargetDay(exploreTree, 3);
exploreTree = renderExplore();
assert.equal(exploreCalls.day.at(-1), 3, 'The real target select forwards a numeric day.');
assert.ok(exploreCalls.placement.slice(-4).every(([, day]) => day === 3));
assert.equal(classNode(card(exploreTree, 'place-trip'), 'mobile-add-today').props.disabled, false);
chooseTargetDay(exploreTree, 2);
exploreTree = renderExplore();

const newEntity = exploreEntities.find((value) => value.id === 'place-new');
const newCard = card(exploreTree, newEntity.id);
const favoriteButton = classNode(newCard, 'mobile-favorite');
const imageButton = classNode(newCard, 'mobile-explore-image');
const copyButton = classNode(newCard, 'mobile-explore-copy');
assert.notEqual(favoriteButton, imageButton);
assert.notEqual(favoriteButton, copyButton);
assert.match(normalizeText(newCard), /A quiet archway/, 'Wide cards retain the existing description.');
for (const button of nodes(exploreTree).filter((node) => node.type === 'button')) {
  assert.equal(nodes(button.props.children).filter((node) => node.type === 'button').length, 0, 'Buttons must not contain other buttons.');
}
favoriteButton.props.onClick();
exploreTree = renderExplore();
assert.equal(exploreController.favorites[newEntity.id], true);
assert.equal(exploreController.favorites['unrelated-favorite'], true);
assert.equal(detailSheet(exploreTree).props.entity, null, 'Favorite does not open details.');
assert.equal(exploreCalls.transfer.length + exploreCalls.add.length, 0, 'Favorite does not add to the plan.');
classNode(card(exploreTree, newEntity.id), 'mobile-explore-image').props.onClick();
exploreTree = renderExplore();
assert.equal(detailSheet(exploreTree).props.entity, newEntity);
assert.equal(exploreCalls.favorites.length, 1, 'Opening details does not toggle favorite.');
detailSheet(exploreTree).props.close();
exploreTree = renderExplore();
assert.equal(detailSheet(exploreTree).props.entity, null);
classNode(card(exploreTree, newEntity.id), 'mobile-explore-copy').props.onClick();
exploreTree = renderExplore();
assert.equal(detailSheet(exploreTree).props.entity, newEntity, 'The separate copy button also opens details.');
detailSheet(exploreTree).props.close();
exploreTree = renderExplore();
classNode(card(exploreTree, newEntity.id), 'mobile-favorite').props.onClick();
exploreTree = renderExplore();
assert.equal(exploreController.favorites[newEntity.id], false);
assert.equal(detailSheet(exploreTree).props.entity, null);

const tripButton = classNode(card(exploreTree, 'place-trip'), 'mobile-add-today');
assert.equal(tripButton.props.disabled, true);
assert.match(textOf(tripButton), /Day 2.*已加入/);
tripButton.props.onClick();
assert.equal(exploreCalls.transfer.length + exploreCalls.add.length, 0, 'A trip placement remains a no-op even if its disabled handler is invoked.');
classNode(card(exploreTree, 'place-backup'), 'mobile-add-today').props.onClick();
assert.deepEqual(exploreCalls.transfer, [[2, 'keep-backup-item', 'alternatives', 'activeItems']]);
assert.equal(exploreCalls.add.length, 0, 'A backup is promoted rather than recreated.');
classNode(card(exploreTree, newEntity.id), 'mobile-add-today').props.onClick();
assert.deepEqual(exploreCalls.add.at(-1), [newEntity.id, 2, 'activeItems']);
const awayButton = classNode(card(exploreTree, 'place-away'), 'mobile-add-today');
assert.equal(awayButton.props.disabled, false, 'A backup on another day does not disable the chosen day.');
awayButton.props.onClick();
assert.deepEqual(exploreCalls.add.at(-1), ['place-away', 2, 'activeItems']);
assert.equal(exploreCalls.transfer.length, 1, 'Adding on a different day does not transfer another day’s backup.');
chooseTargetDay(exploreTree, 3);
exploreTree = renderExplore();
const newDayTripButton = classNode(card(exploreTree, 'place-trip'), 'mobile-add-today');
assert.equal(newDayTripButton.props.disabled, false);
assert.match(textOf(newDayTripButton), /Day 3/);
newDayTripButton.props.onClick();
assert.deepEqual(exploreCalls.add.at(-1), ['place-trip', 3, 'activeItems']);
assert.equal(JSON.stringify(exploreEntities), exploreFixturesBefore, 'Explore handlers must not mutate entity fixtures.');

// The real Explore component and shared copy helper select description sources.
// Deliberately malformed placements prove stale days, IDs and pools cannot leak.
const genericDescription = '查看地点详情与票务信息';
const descriptionCases = deepFreeze([
  { id: 'copy-description', description: '  Entity description wins  ', notes: 'Lower entity notes', expected: 'Entity description wins' },
  { id: 'copy-entity-notes', description: ' \t ', notes: '  Entity notes win  ', expected: 'Entity notes win' },
  { id: 'copy-trip', expected: 'Exact selected trip notes' },
  { id: 'copy-backup', expected: 'Exact selected backup notes' },
  { id: 'copy-wrong-item', expected: genericDescription },
  { id: 'copy-wrong-entity', expected: genericDescription },
  { id: 'copy-other-day', expected: genericDescription },
  { id: 'copy-trip-in-backup', expected: genericDescription },
  { id: 'copy-backup-in-trip', expected: genericDescription },
  { id: 'copy-removed', expected: genericDescription },
  { id: 'copy-unknown-zone', expected: genericDescription },
  { id: 'copy-null-placement', expected: genericDescription },
  { id: 'copy-empty', expected: genericDescription },
  { id: 'copy-whitespace', description: ' \t ', notes: ' \n ', expected: genericDescription },
  { id: 'copy-switch', expected: 'Day two selected trip notes' },
  { id: 'eiffel', expected: '外观近距离参观，不登塔' },
]);
const descriptionEntities = deepFreeze(descriptionCases.map((testCase) => entity(testCase.id, {
  description: testCase.description ?? '', notes: testCase.notes ?? '',
})));
const descriptionPlacementEntries = deepFreeze([
  ['2:copy-description', { dayId: 2, itemId: 'description-priority-item', zone: 'trip' }],
  ['2:copy-entity-notes', { dayId: 2, itemId: 'entity-notes-priority-item', zone: 'trip' }],
  ['2:copy-trip', { dayId: 2, itemId: 'exact-trip-item', zone: 'trip' }],
  ['2:copy-backup', { dayId: 2, itemId: 'exact-backup-item', zone: 'backup' }],
  ['2:copy-wrong-item', { dayId: 2, itemId: 'missing-item-id', zone: 'trip' }],
  ['2:copy-wrong-entity', { dayId: 2, itemId: 'wrong-entity-item', zone: 'trip' }],
  ['2:copy-other-day', { dayId: 1, itemId: 'stale-other-day-item', zone: 'trip' }],
  ['2:copy-trip-in-backup', { dayId: 2, itemId: 'wrong-trip-pool-item', zone: 'trip' }],
  ['2:copy-backup-in-trip', { dayId: 2, itemId: 'wrong-backup-pool-item', zone: 'backup' }],
  ['2:copy-removed', { dayId: 2, itemId: 'removed-only-item', zone: 'trip' }],
  ['2:copy-unknown-zone', { dayId: 2, itemId: 'unknown-zone-item', zone: 'removed' }],
  ['2:copy-whitespace', { dayId: 2, itemId: 'whitespace-item', zone: 'trip' }],
  ['2:copy-switch', { dayId: 2, itemId: 'switch-day-two-item', zone: 'trip' }],
  ['3:copy-switch', { dayId: 3, itemId: 'switch-day-three-item', zone: 'backup' }],
  ['2:eiffel', { dayId: 2, itemId: 'exact-built-in-note-item', zone: 'trip' }],
]);
const descriptionPlacements = new Map(descriptionPlacementEntries);
const descriptionPlan = deepFreeze({
  version: 1, originalPlanId: 'fixture-description-plan',
  // Day IDs intentionally disagree with array positions.
  days: [
    {
      dayId: 3,
      activeItems: [planItem('switch-day-two-item', 'copy-switch', { notes: 'Wrong day three active-pool notes' })],
      alternatives: [planItem('switch-day-three-item', 'copy-switch', { status: 'backup', notes: 'Day three selected backup notes' })],
      removedItems: [],
    },
    {
      dayId: 1,
      activeItems: [planItem('stale-other-day-item', 'copy-other-day', { notes: 'Forbidden other-day notes' })],
      alternatives: [], removedItems: [],
    },
    {
      dayId: 2,
      activeItems: [
        planItem('description-priority-item', 'copy-description', { notes: 'Lower description-plan notes' }),
        planItem('entity-notes-priority-item', 'copy-entity-notes', { notes: 'Lower entity-notes-plan notes' }),
        planItem('trip-decoy-item', 'copy-trip', { notes: 'Forbidden same-entity different-item notes' }),
        planItem('exact-trip-item', 'copy-trip', { notes: '  Exact selected trip notes  ' }),
        planItem('existing-other-item', 'copy-wrong-item', { notes: 'Forbidden wrong-item notes' }),
        planItem('wrong-entity-item', 'different-entity', { notes: 'Forbidden wrong-entity notes' }),
        planItem('stale-other-day-item', 'copy-other-day', { notes: 'Forbidden stale-placement target-day notes' }),
        planItem('exact-backup-item', 'copy-backup', { notes: 'Forbidden backup-in-active notes' }),
        planItem('wrong-backup-pool-item', 'copy-backup-in-trip', { notes: 'Forbidden wrong-backup-pool notes' }),
        planItem('null-placement-item', 'copy-null-placement', { notes: 'Forbidden null-placement notes' }),
        planItem('whitespace-item', 'copy-whitespace', { notes: ' \n\t ' }),
        planItem('switch-day-two-item', 'copy-switch', { notes: 'Day two selected trip notes' }),
        planItem('exact-built-in-note-item', 'eiffel', { notes: 'Exterior / close-up visit. No tower ascent.' }),
      ],
      alternatives: [
        planItem('exact-backup-item', 'copy-backup', { status: 'backup', notes: '  Exact selected backup notes  ' }),
        planItem('wrong-trip-pool-item', 'copy-trip-in-backup', { status: 'backup', notes: 'Forbidden wrong-trip-pool notes' }),
        planItem('unknown-zone-item', 'copy-unknown-zone', { status: 'backup', notes: 'Forbidden unknown-zone backup notes' }),
      ],
      removedItems: [
        planItem('removed-only-item', 'copy-removed', { status: 'removed', notes: 'Forbidden removed-item notes' }),
        planItem('unknown-zone-item', 'copy-unknown-zone', { status: 'removed', notes: 'Forbidden unknown-zone removed notes' }),
      ],
    },
  ],
});
const descriptionFixturesBefore = JSON.stringify({
  entities: descriptionEntities, plan: descriptionPlan, placements: [...descriptionPlacements],
});
const descriptionModule = loadComponent('components/mobile/MobileExplore.tsx', {
  'next/image': { __esModule: true, default: Image },
  'lucide-react': icons,
  '@/lib/entity-library': { normalizeRouteCity: (city) => city },
  '@/features/app/appModel': { cityNames: ['罗马', '巴黎'] },
  '@/lib/media': media,
  '@/features/trip/overviewCopy': overviewCopyModule.exports,
  '@/components/mobile/MobileEntitySheet': { MobileEntitySheet },
  '@/components/mobile/MobilePlanTarget': { MobilePlanTarget },
});
const descriptionDayCalls = [];
const descriptionController = {
  selectedDay: 2, discoverTab: 'places', discoverCity: '罗马',
  entities: descriptionEntities, favorites: {},
  actions: {
    plan: descriptionPlan,
    placement: (id, day) => descriptionPlacements.get(`${day}:${id}`) ?? null,
    transfer: () => assert.fail('Description rendering must not transfer plan items.'),
    addEntity: () => assert.fail('Description rendering must not add plan items.'),
  },
  selectMobileDay: (day) => { descriptionController.selectedDay = day; descriptionDayCalls.push(day); },
  selectMobileDiscoverTab: () => assert.fail('Description checks must not change category.'),
  selectMobileDiscoverCity: () => assert.fail('Description checks must not change city.'),
  setFavorites: () => assert.fail('Description checks must not change favorites.'),
};
const renderDescriptions = (controller = descriptionController) => descriptionModule.render('MobileExplore', { controller });
const descriptionOf = (tree, id) => textOf(classNode(card(tree, id), 'mobile-explore-description'));
let descriptionTree = renderDescriptions();
for (const testCase of descriptionCases) {
  assert.equal(descriptionOf(descriptionTree, testCase.id), testCase.expected, `Incorrect description source for ${testCase.id}`);
}
const missingDayTree = renderDescriptions({
  ...descriptionController,
  actions: { ...descriptionController.actions, plan: { ...descriptionPlan, days: descriptionPlan.days.filter((day) => day.dayId !== 2) } },
});
assert.equal(descriptionOf(missingDayTree, 'copy-trip'), genericDescription, 'An absent target day must not read another day by array position.');
assert.equal(descriptionOf(missingDayTree, 'copy-backup'), genericDescription, 'An absent target day also blocks backup notes.');

function chooseDescriptionDay(tree, day) {
  const target = findNode(tree, (node) => node.type === MobilePlanTarget, 'Missing description target day selector');
  assert.equal(target.props.selectedDay, descriptionController.selectedDay);
  assert.equal(target.props.selectDay, descriptionController.selectMobileDay);
  const actualTarget = MobilePlanTarget(target.props);
  findNode(actualTarget, (node) => node.type === 'select', 'Missing actual description target select').props.onChange({ target: { value: String(day) } });
}
chooseDescriptionDay(descriptionTree, 3);
descriptionTree = renderDescriptions();
assert.equal(descriptionOf(descriptionTree, 'copy-switch'), 'Day three selected backup notes');
assert.equal(descriptionOf(descriptionTree, 'copy-trip'), genericDescription, 'Changing the target day drops earlier trip notes.');
assert.equal(descriptionOf(descriptionTree, 'copy-backup'), genericDescription, 'Changing the target day drops earlier backup notes.');
chooseDescriptionDay(descriptionTree, 2);
descriptionTree = renderDescriptions();
assert.equal(descriptionOf(descriptionTree, 'copy-switch'), 'Day two selected trip notes');
assert.deepEqual(descriptionDayCalls, [3, 2]);

const editedDescriptionPlan = deepFreeze({
  ...descriptionPlan,
  days: descriptionPlan.days.map((day) => ({
    ...day,
    activeItems: day.activeItems.map((item) => item.entityId === 'eiffel' ? { ...item, notes: '用户修改后的说明保留原文' } : item),
  })),
});
const editedNoteTree = renderDescriptions({
  ...descriptionController, actions: { ...descriptionController.actions, plan: editedDescriptionPlan },
});
assert.equal(descriptionOf(editedNoteTree, 'eiffel'), '用户修改后的说明保留原文', 'The real helper translates only its exact built-in note and preserves edited notes.');
assert.equal(JSON.stringify({
  entities: descriptionEntities, plan: descriptionPlan, placements: [...descriptionPlacements],
}), descriptionFixturesBefore, 'Description rendering and day switches leave all entity, plan and placement fixtures unchanged.');

const todayEntities = deepFreeze([
  entity('fixture-hotel', { name: 'Fixture Hotel', type: 'hotel' }),
  entity('fixture-activity', { name: 'Fixture Arrival', type: 'activity' }),
  entity('first-place', { name: 'Fixture First Station' }),
  entity('second-place', { name: 'Fixture Second Station' }),
  entity('backup-place', { name: 'Fixture Backup' }),
  entity('removed-place', { name: 'Fixture Removed' }),
  entity('food-one', { name: 'Fixture Food', type: 'restaurant' }),
  entity('food-two', { name: 'Fixture Other Food', type: 'cafe' }),
  entity('gym-one', { name: 'Fixture Gym', type: 'gym', raw: { distance: 'Fixture distance', time: 'Fixture hours' } }),
]);
const todayEntityMap = new Map(todayEntities.map((value) => [value.id, value]));
const todayPlanDay = deepFreeze({
  dayId: 2,
  activeItems: [
    planItem('hotel-item', 'fixture-hotel', { time: '07:00' }),
    planItem('activity-item', 'fixture-activity', { order: 2, time: '08:00' }),
    planItem('first-item', 'first-place', { order: 3, time: '09:15' }),
    planItem('second-item', 'second-place', { order: 4, time: '11:45' }),
  ],
  alternatives: [planItem('keep-today-backup-id', 'backup-place', { status: 'backup' })],
  removedItems: [planItem('keep-today-removed-id', 'removed-place', { status: 'removed' })],
});
const todayRoute = deepFreeze({
  hotelId: 'fixture-hotel',
  legs: [
    { fromId: 'fixture-hotel', toId: 'first-place', from: 'Fixture Hotel', to: 'Fixture First Station', recommendedMode: 'Walk', walkMin: 12, recommended: 'Fixture walk reference' },
    { fromId: 'first-place', toId: 'second-place', from: 'Fixture First Station', to: 'Fixture Second Station', recommendedMode: 'Transit', transitMin: 22, recommended: 'Fixture transit reference' },
    { fromId: 'second-place', toId: 'fixture-hotel', from: 'Fixture Second Station', to: 'Fixture Hotel', recommendedMode: 'Taxi', taxiTime: 'Fixture taxi time', recommended: 'Fixture return reference' },
  ],
  atGlance: { mustLeaveHotel: '08:35', backHotel: '预计 18:40', tomorrow: 'Fixture tomorrow；待办：Fixture next task' },
  summary: { walkingKm: 4.25 },
});
const todayAction = deepFreeze({ id: 'fixture-reminder', title: 'Fixture day reminder', date: fixtureDays[1].date });
const todayWeather = deepFreeze({ status: 'fixture-weather' });
const todayFixturesBefore = JSON.stringify({ todayEntities, todayPlanDay, todayRoute, fixtureDays, todayAction, todayWeather });
const presentation = {
  buildPlanPresentation: (day, resolve) => day.activeItems.flatMap((item) => {
    const resolved = resolve(item.entityId);
    return resolved ? [{ item, entity: resolved, status: 'core', supportingLabel: `Fixture support ${resolved.id}` }] : [];
  }),
  countPlanStatuses: (rows) => ({ fixed: 0, 'to-book': 0, core: rows.length, flex: 0 }),
  buildTodaysTips: () => [{ id: 'fixture-tip', kind: 'route', text: 'Fixture route tip' }],
};
const todayModule = loadComponent('components/mobile/MobileToday.tsx', {
  'next/image': { __esModule: true, default: Image },
  'lucide-react': icons,
  '@/lib/derive-current-day': { deriveGymFit: () => ({ level: 'flex', label: 'Fixture optional gym' }) },
  '@/features/trip/tripModel': tripModel,
  '@/lib/media': media,
  '@/components/weather/WeatherChip': { WeatherChip },
  '@/features/readiness/readinessModel': { actionForDay: (queue, date) => queue.find((action) => action.date === date) },
  '@/features/trip/tripPresentationModel': presentation,
  '@/components/trip/TripStatusBadge': { DayStatusSummary, StatusBadge },
  '@/views/trip/TodaysTipsCard': { TodaysTipsCard },
});
const todayCalls = { dayPicker: 0, hotel: 0, navigation: [], tab: [], entity: [], more: [], transfer: [], day: [], reminder: [] };
const todayController = {
  bookingStatuses: {}, resolve: (id) => todayEntityMap.get(id), actionQueue: [todayAction],
  actions: {
    plan: { days: [{ dayId: 1 }, todayPlanDay, { dayId: 3 }] },
    transfer: (...args) => todayCalls.transfer.push(args),
    addEntity: () => assert.fail('Today backup and removed actions must transfer existing items.'),
  },
  navigateMobile: (view) => todayCalls.navigation.push(view),
  selectMobilePlanTab: (tab) => todayCalls.tab.push(tab),
  selectMobileDay: (day) => todayCalls.day.push(day),
  openAction: (action) => todayCalls.reminder.push(action),
};
const todayTrip = { day: fixtureDays[1], planDay: todayPlanDay, stay: { hotelName: 'Fixture Hotel' }, dayState: {}, currentRoute: todayRoute };
const todayProps = {
  controller: todayController, trip: todayTrip,
  food: [todayEntityMap.get('food-one'), todayEntityMap.get('food-two')], gym: todayEntityMap.get('gym-one'),
  openEntity: (value) => todayCalls.entity.push(value),
  openHotel: () => { todayCalls.hotel += 1; },
  openActions: (selection) => todayCalls.more.push(selection),
  openDayPicker: () => { todayCalls.dayPicker += 1; },
  weather: todayWeather, nextStopDistance: 'Fixture 500 m',
};
const renderToday = (overrides = {}) => todayModule.render('MobileToday', { ...todayProps, ...overrides });
const todayTree = renderToday();
const firstStation = classNode(todayTree, 'mobile-next-card');
assert.match(normalizeText(firstStation), /今日首站/);
assert.match(normalizeText(todayTree), /按行程顺序/);
assert.doesNotMatch(normalizeText(todayTree), /按时间顺序/);
for (const fallbackItem of todayPlanDay.activeItems.slice(0, 2)) {
  const fallbackTree = renderToday({ trip: { ...todayTrip, planDay: { ...todayPlanDay, activeItems: [fallbackItem] } } });
  const fallbackCard = classNode(fallbackTree, 'mobile-next-card');
  assert.match(normalizeText(fallbackCard), /行程起点/);
  assert.doesNotMatch(normalizeText(fallbackCard), /今日首站/);
  if (fallbackItem.entityId === 'fixture-activity') {
    assert.equal(nodes(fallbackCard).filter((node) => node.type === 'a').length, 0, 'A non-location activity must not offer a map search as its primary action.');
    buttonByText(fallbackCard, /查看安排/).props.onClick();
    assert.equal(todayCalls.entity.at(-1), todayEntityMap.get('fixture-activity'));
  }
}
assert.doesNotMatch(normalizeText(firstStation), /下一站|实时|NEXT STOP/i, 'The station card describes the first planned visit, not live progress.');
assert.match(normalizeText(firstStation), /Fixture First Station/);
assert.doesNotMatch(normalizeText(firstStation), /Fixture Arrival|Fixture Hotel/);
findNode(firstStation, (node) => node.type === 'button' && node.props['aria-label'] === '查看 Fixture First Station', 'Missing first-station details button').props.onClick();
assert.equal(todayCalls.entity.at(-1), todayEntityMap.get('first-place'));
assert.equal(findNode(firstStation, (node) => node.type === 'a', 'Missing first-station navigation').props.href, 'https://example.test/map/first-place');

const glance = classNode(todayTree, 'mobile-glance');
const glanceText = normalizeText(glance);
for (const value of ['08:35', '4.25', '18:40']) assert.ok(glanceText.includes(value), `Missing glance value ${value}`);
assert.match(glanceText, /4\s*项安排/, 'Glance counts only the resolved formal rows.');
assert.ok(nodes(glance).every((node) => !node.props.hidden), 'All four glance values remain rendered and visible in markup.');
const weatherNode = findNode(todayTree, (node) => node.type === WeatherChip, 'Missing weather context');
assert.equal(weatherNode.props.weather, todayWeather);
assert.equal(weatherNode.props.compact, true);
findNode(todayTree, (node) => node.type === 'button' && node.props['aria-label'] === '选择旅行日', 'Missing day picker').props.onClick();
assert.equal(todayCalls.dayPicker, 1);

const shortcuts = classNode(todayTree, 'mobile-day-shortcuts');
const hotelButton = buttonByText(shortcuts, /^酒店$/);
assert.equal(hotelButton.props.disabled, false);
hotelButton.props.onClick();
assert.equal(todayCalls.hotel, 1);
buttonByText(shortcuts, /^当天交通$/).props.onClick();
assert.deepEqual(todayCalls.navigation, ['plan']);
assert.deepEqual(todayCalls.tab, ['transport']);
buttonByText(shortcuts, /^订单与票据$/).props.onClick();
assert.deepEqual(todayCalls.navigation, ['plan', 'plan']);
assert.deepEqual(todayCalls.tab, ['transport', 'bookings']);
classNode(todayTree, 'mobile-day-reminder').props.onClick();
assert.equal(todayCalls.reminder.at(-1), todayAction);
for (const [index, item] of todayPlanDay.activeItems.entries()) {
  const step = findNode(todayTree, (node) => hasClass(node, 'mobile-timeline-step') && node.key === item.id, `Missing timeline item ${item.id}`);
  classNode(step, 'mobile-plan-main').props.onClick();
  assert.equal(todayCalls.entity.at(-1), todayEntityMap.get(item.entityId));
  classNode(step, 'mobile-more-button').props.onClick();
  const selection = todayCalls.more.at(-1);
  assert.equal(selection.item, item);
  assert.equal(selection.entity, todayEntityMap.get(item.entityId));
  assert.equal(selection.index, index);
  assert.equal(selection.total, todayPlanDay.activeItems.length);
}

const pools = classNode(todayTree, 'mobile-day-pools');
const backupRow = findNode(pools, (node) => node.type === 'article' && node.key === 'keep-today-backup-id', 'Missing Today backup');
buttonByText(backupRow, /加入/).props.onClick();
assert.deepEqual(todayCalls.transfer.at(-1), [2, 'keep-today-backup-id', 'alternatives', 'activeItems']);
const removedRow = findNode(pools, (node) => node.type === 'article' && node.key === 'keep-today-removed-id', 'Missing removed item');
buttonByText(removedRow, /恢复到备选/).props.onClick();
assert.deepEqual(todayCalls.transfer.at(-1), [2, 'keep-today-removed-id', 'removedItems', 'alternatives']);
classNode(backupRow, 'mobile-pool-name').props.onClick();
assert.equal(todayCalls.entity.at(-1), todayEntityMap.get('backup-place'));
classNode(removedRow, 'mobile-pool-name').props.onClick();
assert.equal(todayCalls.entity.at(-1), todayEntityMap.get('removed-place'));
const tomorrow = classNode(todayTree, 'mobile-important-action');
assert.match(normalizeText(tomorrow), /Fixture tomorrow/);
assert.doesNotMatch(normalizeText(tomorrow), /Fixture next task/);
buttonByText(tomorrow, /D3|Day 3/).props.onClick();
assert.deepEqual(todayCalls.day, [3]);

const noStayTree = renderToday({ trip: { ...todayTrip, stay: undefined } });
assert.equal(buttonByText(classNode(noStayTree, 'mobile-day-shortcuts'), /^酒店$/).props.disabled, true);
const lastDayTree = renderToday({ trip: { ...todayTrip, day: fixtureDays[2] } });
assert.equal(nodes(lastDayTree).filter((node) => hasClass(node, 'mobile-important-action')).length, 0, 'The final day offers no nonexistent next day.');
assert.ok(classNode(todayTree, 'mobile-food-section'));
assert.ok(classNode(todayTree, 'mobile-gym-section'));
buttonByText(classNode(todayTree, 'mobile-gym-section'), /查看健身房/).props.onClick();
assert.equal(todayCalls.entity.at(-1), todayEntityMap.get('gym-one'));
assert.equal(JSON.stringify({ todayEntities, todayPlanDay, todayRoute, fixtureDays, todayAction, todayWeather }), todayFixturesBefore, 'Today rendering and callbacks must not mutate fixture facts.');

console.log('Mobile workbench tests passed: real Today/Explore handlers preserve chosen-day placement, favorite/detail separation, first-station semantics, all glance values, shortcuts, item action payloads and pool transfers.');
