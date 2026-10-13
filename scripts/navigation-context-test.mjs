import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// The actual controller, URL hook, storage hook and models execute in a fresh VM.
// React's hook scheduling and the browser surfaces are isolated memory adapters.
// No globals, browser, real storage, source facts or runtime are modified.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const compiled = new Map();
const changedDeps = (before, after) => !before || !after || before.length !== after.length || after.some((value, index) => !Object.is(value, before[index]));

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    snapshot: () => Object.fromEntries(values),
  };
}

function createHarness(href, stored = {}, scroll = {}) {
  let currentUrl = new URL(href);
  const localStorage = memoryStorage(stored);
  const sessionStorage = memoryStorage(scroll);
  const listeners = new Map();
  const timers = new Map();
  let timerId = 0;
  const writes = [];
  const historyUrls = [currentUrl.href];
  let historyIndex = 0;
  const location = {
    get href() { return currentUrl.href; },
    get pathname() { return currentUrl.pathname; },
    get search() { return currentUrl.search; },
    reload() { throw new Error('Backup reload is outside navigation test scope'); },
  };
  const changeUrl = (mode, relativeUrl) => {
    currentUrl = new URL(relativeUrl, currentUrl);
    writes.push({ mode, href: currentUrl.href });
    if (mode === 'replace') historyUrls[historyIndex] = currentUrl.href;
    else {
      historyUrls.splice(historyIndex + 1);
      historyUrls.push(currentUrl.href);
      historyIndex++;
    }
  };
  const window = {
    location, localStorage, sessionStorage, scrollY: 0,
    scrollTo() {},
    setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(callback);
    },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
    dispatchEvent(event) { listeners.get(event.type)?.forEach((callback) => callback(event)); return true; },
    history: {
      pushState(_state, _title, url) { changeUrl('push', url); },
      replaceState(_state, _title, url) { changeUrl('replace', url); },
      back() {
        if (historyIndex === 0) return;
        currentUrl = new URL(historyUrls[--historyIndex]);
        window.dispatchEvent({ type: 'popstate' });
      },
    },
  };
  class TestEvent {
    constructor(type, options = {}) { this.type = type; Object.assign(this, options); }
  }
  class TestObserver { observe() {} unobserve() {} disconnect() {} }

  const hookSlots = [];
  let cursor = 0;
  let dirty = true;
  let pendingEffects = [];
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!hookSlots[index]) hookSlots[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [hookSlots[index].value, (next) => {
        const value = typeof next === 'function' ? next(hookSlots[index].value) : next;
        if (!Object.is(value, hookSlots[index].value)) { hookSlots[index].value = value; dirty = true; }
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!hookSlots[index]) hookSlots[index] = { current: initial };
      return hookSlots[index];
    },
    useMemo(factory, deps) {
      const index = cursor++;
      if (!hookSlots[index] || changedDeps(hookSlots[index].deps, deps)) hookSlots[index] = { value: factory(), deps };
      return hookSlots[index].value;
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!hookSlots[index] || changedDeps(hookSlots[index].deps, deps)) {
        const cleanup = hookSlots[index]?.cleanup;
        hookSlots[index] = { deps, cleanup };
        pendingEffects.push(() => { cleanup?.(); hookSlots[index].cleanup = effect(); });
      }
    },
    useSyncExternalStore(subscribe, getSnapshot) {
      react.useEffect(() => subscribe(() => { dirty = true; }), [subscribe]);
      return getSnapshot();
    },
  };
  const context = vm.createContext({
    window, location, localStorage, sessionStorage, navigator: { onLine: true },
    document: { body: {}, querySelectorAll: () => [] },
    URL, URLSearchParams, Event: TestEvent, CustomEvent: TestEvent, StorageEvent: TestEvent,
    IntersectionObserver: TestObserver, MutationObserver: TestObserver,
  });
  const modules = new Map();
  const jsonSources = new Map();
  function loadSource(requested) {
    const file = [requested, `${requested}.ts`, `${requested}.tsx`, `${requested}.json`].find((candidate) => fs.existsSync(candidate));
    assert.ok(file, `Unable to resolve test module: ${requested}`);
    if (modules.has(file)) return modules.get(file).exports;
    const sourceModule = { exports: {} };
    modules.set(file, sourceModule);
    if (file.endsWith('.json')) {
      sourceModule.exports = JSON.parse(fs.readFileSync(file, 'utf8'));
      jsonSources.set(file, JSON.stringify(sourceModule.exports));
      return sourceModule.exports;
    }
    if (!compiled.has(file)) compiled.set(file, ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: file,
    }).outputText);
    const localRequire = (specifier) => {
      if (specifier === 'react') return react;
      if (specifier.startsWith('@/')) return loadSource(path.join(root, specifier.slice(2)));
      if (specifier.startsWith('.')) return loadSource(path.resolve(path.dirname(file), specifier));
      throw new Error(`Unexpected dependency in controller test: ${specifier}`);
    };
    const execute = new vm.Script(`(function(require, module, exports) {\n${compiled.get(file)}\n})`, { filename: file }).runInContext(context);
    execute(localRequire, sourceModule, sourceModule.exports);
    return sourceModule.exports;
  }
  const { useAppController: controllerHook } = loadSource(path.join(root, 'features/app/useAppController.ts'));
  const { readUrlState } = loadSource(path.join(root, 'hooks/use-url-state.ts'));
  let controller;
  function settle() {
    for (let pass = 0; pass < 40; pass++) {
      dirty = false;
      cursor = 0;
      controller = controllerHook();
      const effects = pendingEffects;
      pendingEffects = [];
      effects.forEach((effect) => effect());
      for (let round = 0; timers.size && round < 40; round++) {
        const callbacks = [...timers.values()];
        timers.clear();
        callbacks.forEach((callback) => callback());
      }
      if (!dirty && !timers.size && !pendingEffects.length) return controller;
    }
    throw new Error('Isolated controller failed to settle');
  }
  settle();
  const businessBefore = JSON.stringify(localStorage.snapshot());
  return {
    get controller() { return controller; },
    get href() { return currentUrl.href; },
    get url() { return readUrlState(); },
    writes,
    run(method, ...args) { controller[method](...args); return settle(); },
    reload() { return createHarness(currentUrl.href, localStorage.snapshot(), sessionStorage.snapshot()); },
    back() { window.history.back(); return settle(); },
    assertPreserved() {
      assert.equal(JSON.stringify(localStorage.snapshot()), businessBefore, 'Navigation must not change business storage');
      for (const [file, before] of jsonSources) assert.equal(JSON.stringify(modules.get(file).exports), before, 'Navigation must not mutate source facts');
    },
  };
}

const start = (day, view = 'home', tab, city) => {
  const url = new URL('https://navigation.test/');
  url.searchParams.set('view', view);
  url.searchParams.set('day', String(day));
  if (tab) url.searchParams.set('tab', tab);
  if (city) url.searchParams.set('city', city);
  const harness = createHarness(url.href);
  assert.equal(harness.controller.selectedDay, day, 'Mount must apply the original day URL');
  return harness;
};

function assertReload(harness, day, { view, tab = null, city = null } = {}) {
  const fresh = harness.reload();
  assert.equal(fresh.controller.selectedDay, day, `Fresh reload must retain Day ${day}`);
  assert.equal(harness.url.day, day, `${view} URL must retain selected Day ${day}`);
  assert.equal(harness.url.view, view);
  assert.equal(harness.url.tab, tab);
  assert.equal(harness.url.city, city);
  harness.assertPreserved();
  if (['plan', 'discover', 'more'].includes(view)) assert.equal(fresh.controller.view, view);
  if (view === 'plan') assert.equal(fresh.controller.planTab, tab);
  if (view === 'discover' || view === 'explore') {
    assert.equal(fresh.controller.discoverTab, tab);
    assert.equal(fresh.controller.discoverCity, city);
  }
  if (view === 'more') assert.equal(fresh.controller.moreTab, tab === 'routes' ? 'map' : tab);
  fresh.run('navigate', 'home');
  assert.equal(fresh.url.day, day);
  assert.equal(fresh.url.view, 'home');
  assert.equal(fresh.controller.selectedDay, day);
  assert.equal(fresh.reload().controller.selectedDay, day, 'Returning Home must preserve the day on another reload');
  fresh.assertPreserved();
}

// Keep the reported failing path first so running against the old source
// reproduces the loss before any general navigation assertions.
for (const day of [2, 15]) {
  const budget = start(day);
  budget.run('openBudget');
  assertReload(budget, day, { view: 'plan', tab: 'budget' });
  assert.equal(budget.writes.length, 2);
  assert.deepEqual(budget.writes.map((write) => write.mode), ['push', 'replace']);
  budget.writes.forEach((write) => assert.equal(new URL(write.href).searchParams.get('day'), String(day), 'Intermediate history entries must also retain day'));

  for (const [view, tab, city] of [['home', null, null], ['plan', 'readiness', null], ['discover', 'places', '罗马'], ['more', 'stay', null]]) {
    const harness = start(day);
    harness.run('navigate', view, day === 2 ? 15 : 2);
    assertReload(harness, day, { view, tab, city });
  }
  const trip = start(day);
  const tripDay = day === 2 ? 15 : 2;
  trip.run('navigate', 'trip', tripDay);
  assert.equal(trip.controller.selectedDay, tripDay);
  assertReload(trip, tripDay, { view: 'trip' });

  for (const tab of ['budget', 'bookings']) {
    const harness = start(day, 'plan', 'readiness');
    harness.run('selectPlanTab', tab);
    assertReload(harness, day, { view: 'plan', tab });
  }
  for (const tab of ['food', 'photos']) {
    const harness = start(day, 'discover', 'places', '巴黎');
    harness.run('selectDiscoverTab', tab);
    assertReload(harness, day, { view: 'discover', tab, city: '巴黎' });
  }
  for (const city of ['巴黎', '维也纳']) {
    const harness = start(day, 'discover', 'food', '罗马');
    harness.run('selectDiscoverCity', city);
    assertReload(harness, day, { view: 'discover', tab: 'food', city });
  }
  const readiness = start(day);
  readiness.run('openReadiness');
  assertReload(readiness, day, { view: 'plan', tab: 'readiness' });
  const action = start(day);
  action.run('openAction', { id: 'navigation-fixture', target: 'deadlines' });
  assertReload(action, day, { view: 'plan', tab: 'deadlines' });

  for (const [view, tab, city] of [['today', null, null], ['map', null, null], ['explore', 'places', '罗马'], ['plan', 'readiness', null], ['more', 'stay', null]]) {
    const harness = start(day);
    harness.run('navigateMobile', view);
    assert.equal(harness.controller.mobileView, view);
    assert.equal(harness.reload().controller.mobileView, view);
    assertReload(harness, day, { view, tab, city });
  }
  for (const [method, view, initialTab, initialCity, value, tab, city] of [
    ['selectMobilePlanTab', 'plan', 'readiness', null, 'budget', 'budget', null],
    ['selectMobileDiscoverTab', 'explore', 'places', '巴黎', 'food', 'food', '巴黎'],
    ['selectMobileDiscoverCity', 'explore', 'photos', '罗马', '维也纳', 'photos', '维也纳'],
    ['selectMobileMoreTab', 'more', 'stay', null, 'map', 'routes', null],
    ['selectMoreTab', 'more', 'stay', null, 'documents', 'documents', null],
  ]) {
    const harness = start(day, view, initialTab, initialCity);
    harness.run(method, value);
    assertReload(harness, day, { view, tab, city });
  }
}
const history = start(2);
history.run('navigate', 'trip', 15);
history.run('navigate', 'plan');
history.back();
assert.equal(history.url.view, 'trip');
assert.equal(history.controller.selectedDay, 15);
history.back();
assert.equal(history.url.view, 'home');
assert.equal(history.controller.selectedDay, 2);
history.assertPreserved();
console.log('Navigation context passed: actual controller/URL hooks, Day 2/15 budget reload, navigation/tab/city routes, intermediate history, Home return, mobile regressions and unchanged business storage/source facts.');
