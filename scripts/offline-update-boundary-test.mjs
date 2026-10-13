import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';

// Actual worker/component code with in-memory browser API adapters. This never
// connects to a browser, service, private export or user storage.
const baseline = process.argv.includes('--baseline');
const workerSource = baseline ? execFileSync('git', ['show', 'HEAD:public/sw.js'], { encoding: 'utf8' }) : readFileSync('public/sw.js', 'utf8');
const ORIGIN = 'https://offline-test.example';
const SHELL = workerSource.match(/const SHELL_CACHE = '([^']+)'/)[1];
const METADATA = 'europe-travel-os-pack-metadata-v1';
const OLD_SHELL = 'europe-travel-os-shell-v11';
const RECORD = '/__offline-pack-ready__';
const OLD = 'europe-travel-os-offline-oldmedia-oldapp';
const html = (entry) => `<html><script type="module" src="${entry}"></script></html>`;
const entry = (version) => `/_next/static/chunks/index-${version}.js`;
const lazy = (version) => `/_next/static/chunks/mobile-${version}.js`;
const manifests = (version) => ({
  media: { version: `${version}media`, totalBytes: 100, assets: ['/offline-core.json', '/image.webp'] },
  app: { version: `${version}app`, totalBytes: 200, entry: entry(version), assets: ['/', '/_next/static/offline-app.json', entry(version), lazy(version)] },
});
const normalize = (input) => new URL(typeof input === 'string' ? input : input.url, ORIGIN).href;
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const settle = async () => { for (let i = 0; i < 12; i++) await new Promise((resolve) => setImmediate(resolve)); };

function harness({ seeded = true, source = workerSource } = {}) {
  const stores = new Map();
  const listeners = new Map();
  const calls = [];
  const recordWrites = [];
  let version = 'new';
  let offline = false;
  let failure = null;
  let gate = null;
  let badHtml = null;
  let rejectRecord = false;
  let rejectCleanup = false;
  let recordGate = null;
  const timers = new Map();
  let timerId = 0;
  const cacheApi = (store) => ({
    match: async (input) => store.get(normalize(input))?.clone(),
    put: async (input, response) => {
      if (normalize(input) === normalize(RECORD) && rejectRecord) throw new Error('QuotaExceededError');
      if (normalize(input) === normalize(RECORD) && recordGate) await recordGate.promise;
      if (normalize(input) === normalize(RECORD)) recordWrites.push(await response.clone().json());
      store.set(normalize(input), response.clone());
    },
    keys: async () => [...store.keys()].map((url) => new Request(url)),
    delete: async (input) => store.delete(normalize(input)),
  });
  const caches = {
    keys: async () => [...stores.keys()],
    open: async (name) => { if (!stores.has(name)) stores.set(name, new Map()); return cacheApi(stores.get(name)); },
    delete: async (name) => { if (rejectCleanup && name.endsWith('-obsolete')) throw new Error('delete failed'); return stores.delete(name); },
    match: async (input) => { for (const store of stores.values()) { const response = await cacheApi(store).match(input); if (response) return response; } },
  };
  if (seeded) {
    const { media, app } = manifests('old');
    stores.set(OLD, new Map([
      [normalize('/offline-core.json'), Response.json(media)],
      [normalize('/_next/static/offline-app.json'), Response.json(app)],
      [normalize('/'), new Response(html(entry('old')), { headers: { 'content-type': 'text/html' } })],
      [normalize('/image.webp'), new Response('old image')],
      [normalize(entry('old')), new Response('old bootstrap')],
      [normalize(lazy('old')), new Response('old lazy')],
    ]));
    // A successful online navigation after a deployment can already have
    // replaced the ordinary shell with HTML for the not-yet-downloaded build.
    stores.set(SHELL, new Map([
      [normalize('/'), new Response(html(entry('new')), { headers: { 'content-type': 'text/html' } })],
      [normalize('/?view=today&day=15'), new Response(html(entry('new')), { headers: { 'content-type': 'text/html' } })],
    ]));
  }
  const fetch = async (input, options = {}) => {
    const url = new URL(normalize(input));
    calls.push(url.pathname);
    if (offline) throw new Error('Offline');
    if (gate && url.pathname === lazy(version)) await gate.promise;
    if (failure === url.pathname) throw new Error('Failed download');
    const { media, app } = manifests(version);
    if (url.pathname === '/offline-core.json') return Response.json(media, { status: failure === 'media-http' ? 503 : 200 });
    if (url.pathname === '/_next/static/offline-app.json') return Response.json(app);
    if (url.pathname === '/') return new Response(badHtml || html(entry(version)), { headers: { 'content-type': 'text/html' } });
    if (failure === 'stalled-body' && url.pathname === lazy(version)) {
      return new Response(new ReadableStream({ start(controller) { options.signal.addEventListener('abort', () => controller.error(new Error('Aborted stalled body'))); } }));
    }
    return new Response(`${version} ${url.pathname}`);
  };
  vm.runInNewContext(source, {
    self: { location: { origin: ORIGIN }, clients: { claim: async () => undefined }, addEventListener: (type, callback) => listeners.set(type, callback) },
    caches, fetch, Response, Headers, URL, Date, Set, AbortController,
    setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout: (id) => timers.delete(id),
  });
  const message = (type = 'DOWNLOAD_OFFLINE_PACK', disconnected = false) => {
    const messages = [];
    let work = Promise.resolve();
    const port = { closed: disconnected, postMessage: (data) => { if (port.closed) throw new Error('Closed port'); messages.push(data); } };
    listeners.get('message')({ data: { type }, ports: [port], waitUntil: (promise) => { work = promise; } });
    return { messages, port, work };
  };
  const request = async (path, navigate = false) => {
    const lifetime = [];
    let response = Promise.resolve(Response.error());
    listeners.get('fetch')({ request: { method: 'GET', mode: navigate ? 'navigate' : 'cors', url: normalize(path) }, respondWith: (promise) => { response = promise; }, waitUntil: (promise) => lifetime.push(promise) });
    const result = await response;
    await Promise.all(lifetime);
    return result;
  };
  return {
    stores, calls, recordWrites, timers, caches, message, request,
    activate: async () => { let work = Promise.resolve(); listeners.get('activate')({ waitUntil: (promise) => { work = promise; } }); await work; },
    setVersion: (value) => { version = value; }, setOffline: () => { offline = true; },
    fail: (value) => { failure = value; }, badHtml: (value) => { badHtml = value; },
    gate: (value) => { gate = value; }, recordGate: (value) => { recordGate = value; }, rejectRecord: () => { rejectRecord = true; }, allowRecord: () => { rejectRecord = false; }, rejectCleanup: () => { rejectCleanup = true; stores.set('europe-travel-os-offline-obsolete', new Map()); },
  };
}

function publishedV11(test) {
  const cacheName = `${OLD}-pending-published`;
  const store = test.stores.get(OLD);
  test.stores.delete(OLD);
  test.stores.set(cacheName, store);
  const pack = { cacheName, version: 'oldmedia-oldapp', assets: [...store.keys()].map((url) => new URL(url).pathname), total: store.size, totalBytes: 300 };
  const oldShell = test.stores.get(OLD_SHELL) || new Map();
  oldShell.set(normalize(RECORD), Response.json(pack));
  test.stores.set(OLD_SHELL, oldShell);
  return pack;
}

const upgradeSource = workerSource.replace(/const SHELL_CACHE = '[^']+';/, "const SHELL_CACHE = 'europe-travel-os-shell-v12';");
const upgrade = harness({ source: upgradeSource });
const v11Pack = publishedV11(upgrade);
await upgrade.activate();
const upgradedStatus = upgrade.message('GET_OFFLINE_PACK_STATUS');
await upgradedStatus.work;
assert.equal(upgradedStatus.messages.at(-1).pack?.cacheName, v11Pack.cacheName, 'Activating a new shell must retain the published pending-named pack.');
assert.ok(upgrade.stores.has(METADATA));
assert.ok(!upgrade.stores.has(OLD_SHELL), 'Old shell is removed only after its record has a stable home.');
upgrade.setOffline();
assert.equal(await (await upgrade.request('/?view=today&day=15', true)).text(), html(entry('old')));
assert.equal(await (await upgrade.request(lazy('old'))).text(), 'old lazy');
const secondUpgrade = harness({ seeded: false, source: upgradeSource.replace('europe-travel-os-shell-v12', 'europe-travel-os-shell-v13') });
for (const [name, store] of upgrade.stores) secondUpgrade.stores.set(name, store);
await secondUpgrade.activate();
const durableStatus = secondUpgrade.message('GET_OFFLINE_PACK_STATUS');
await durableStatus.work;
assert.equal(durableStatus.messages.at(-1).pack?.cacheName, v11Pack.cacheName, 'A second worker generation must read the stable pointer without shell migration.');
assert.ok(!METADATA.startsWith('europe-travel-os-shell-') && !METADATA.startsWith('europe-travel-os-offline-'));

const migrationQuota = harness({ source: upgradeSource });
publishedV11(migrationQuota);
migrationQuota.rejectRecord();
await migrationQuota.activate();
assert.ok(migrationQuota.stores.has(OLD_SHELL), 'Migration quota failure must retain the published old shell pointer.');
const quotaStatus = migrationQuota.message('GET_OFFLINE_PACK_STATUS');
await quotaStatus.work;
assert.equal(quotaStatus.messages.at(-1).pack?.version, 'oldmedia-oldapp');
migrationQuota.setOffline();
assert.equal(await (await migrationQuota.request('/?view=today&day=8', true)).text(), html(entry('old')));
migrationQuota.allowRecord();
await migrationQuota.activate();
assert.ok(!migrationQuota.stores.has(OLD_SHELL), 'A later successful migration may clean the retained old shell.');

const unpublished = harness({ source: upgradeSource });
const unpublishedPack = publishedV11(unpublished);
unpublished.stores.get(OLD_SHELL).delete(normalize(RECORD));
await unpublished.activate();
const unpublishedStatus = unpublished.message('GET_OFFLINE_PACK_STATUS');
await unpublishedStatus.work;
assert.equal(unpublishedStatus.messages.at(-1).pack, null, 'A pending cache with no published pointer must never be adopted, even when its resources are complete.');
assert.ok(unpublished.stores.has(unpublishedPack.cacheName));
unpublished.setOffline();
assert.equal((await unpublished.request(entry('old'))).type, 'error');

for (const invalid of ['missing-resource', 'bad-app-manifest', 'mismatched-html']) {
  const test = harness({ source: upgradeSource });
  const pack = publishedV11(test);
  const store = test.stores.get(pack.cacheName);
  if (invalid === 'missing-resource') store.delete(normalize(lazy('old')));
  if (invalid === 'bad-app-manifest') store.set(normalize('/_next/static/offline-app.json'), Response.json({ ...manifests('old').app, version: 'unpublished' }));
  if (invalid === 'mismatched-html') store.set(normalize('/'), new Response(html(entry('new')), { headers: { 'content-type': 'text/html' } }));
  await test.activate();
  const checked = test.message('GET_OFFLINE_PACK_STATUS');
  await checked.work;
  assert.equal(checked.messages.at(-1).pack, null, `${invalid} must fail published-pointer migration validation.`);
}

const migrationRace = harness({ source: upgradeSource });
publishedV11(migrationRace);
const migrationGate = deferred();
migrationRace.recordGate(migrationGate);
const activation = migrationRace.activate();
await settle();
const duringMigration = migrationRace.message();
await settle();
assert.equal(migrationRace.calls.length, 0, 'Downloading must wait for the in-flight record migration.');
migrationGate.resolve();
await Promise.all([activation, duringMigration.work]);
assert.equal(migrationRace.recordWrites.length, 2, 'Activation and download must share one migration before the new commit.');
assert.equal(migrationRace.recordWrites.at(-1).version, 'newmedia-newapp', 'No late migration may overwrite the new published pack.');

const failed = harness();
failed.fail(lazy('new'));
const attempt = failed.message();
await attempt.work;
assert.equal(attempt.messages.at(-1).type, 'error');
assert.ok(failed.stores.has(OLD), 'A failed update must retain the old pack.');
failed.setOffline();
const retainedHtml = await (await failed.request('/?view=today&day=15', true)).text();
assert.equal(retainedHtml, html(entry('old')), 'Retained pack must supply its matching HTML despite newer online navigation caches.');
assert.equal(await (await failed.request(entry('old'))).text(), 'old bootstrap', 'Retained HTML must load its actual bootstrap.');
assert.equal(await (await failed.request(lazy('old'))).text(), 'old lazy', 'Previously unvisited UI must still load.');
assert.equal((await failed.request(entry('new'))).type, 'error', 'An incomplete update must not leak new assets into offline fallback.');
const status = failed.message('GET_OFFLINE_PACK_STATUS');
await status.work;
assert.equal(status.messages.at(-1).pack.version, 'oldmedia-oldapp');

for (const failure of ['media-http', 'mismatched-html', 'wrong-bootstrap', 'commit-quota']) {
  const test = harness();
  if (failure === 'media-http') test.fail(failure);
  if (failure === 'mismatched-html') test.badHtml(html(entry('other-build')));
  if (failure === 'wrong-bootstrap') test.badHtml(html(lazy('new')));
  if (failure === 'commit-quota') test.rejectRecord();
  const update = test.message();
  await update.work;
  assert.equal(update.messages.at(-1).type, 'error', `${failure} must not report ready.`);
  assert.ok(test.stores.has(OLD), `${failure} must retain the old cache.`);
  assert.equal(update.messages.at(-1).pack.version, 'oldmedia-oldapp', `${failure} must acknowledge the usable previous pack.`);
  test.setOffline();
  assert.equal(await (await test.request('/?view=today&day=8', true)).text(), html(entry('old')), `${failure} must retain working offline HTML.`);
  assert.equal(await (await test.request(entry('old'))).text(), 'old bootstrap');
}

const sameVersion = harness();
sameVersion.setVersion('old');
sameVersion.fail(lazy('old'));
const sameAttempt = sameVersion.message();
await sameAttempt.work;
assert.equal(sameAttempt.messages.at(-1).type, 'error', 'Retrying the same version must not edit or silently reuse the ready cache.');
assert.equal(await sameVersion.stores.get(OLD).get(normalize('/')).clone().text(), html(entry('old')));

const concurrent = harness();
const gate = deferred();
concurrent.gate(gate);
const first = concurrent.message();
await settle();
first.port.closed = true;
const second = concurrent.message();
const reopened = concurrent.message('GET_OFFLINE_PACK_STATUS');
assert.equal(second.messages[0].type, 'progress');
assert.equal(reopened.messages[0].type, 'progress', 'A remounted page must reconnect to the active download.');
gate.resolve();
await Promise.all([first.work, second.work, reopened.work]);
assert.equal(concurrent.calls.filter((url) => url === '/offline-core.json').length, 1, 'Duplicate requests must share a single transaction.');
assert.equal(second.messages.at(-1).type, 'complete');
assert.equal(reopened.messages.at(-1).type, 'complete', 'Disconnected original page must not prevent commit.');
assert.ok(concurrent.stores.has(OLD), 'Already open pages must retain their preceding build for lazy imports.');
const committed = concurrent.message('GET_OFFLINE_PACK_STATUS');
await committed.work;
assert.equal(committed.messages.at(-1).pack.version, 'newmedia-newapp');
concurrent.setOffline();
assert.equal(await (await concurrent.request('/?view=more&day=8', true)).text(), html(entry('new')));
assert.equal(await (await concurrent.request(lazy('old'))).text(), 'old lazy', 'A successfully updated page that is still running old code must load its unvisited lazy module.');

const cleanup = harness();
cleanup.rejectCleanup();
const cleanupAttempt = cleanup.message();
await cleanupAttempt.work;
assert.equal(cleanupAttempt.messages.at(-1).type, 'complete', 'Cleanup failure cannot falsify successful commit.');
assert.ok(cleanupAttempt.messages.every((event) => event.type !== 'error'));

const lookupRace = harness();
const initialStatus = lookupRace.message('GET_OFFLINE_PACK_STATUS');
const simultaneousUpdate = lookupRace.message();
await Promise.all([initialStatus.work, simultaneousUpdate.work]);
assert.equal(lookupRace.recordWrites.length, 2, 'Concurrent initial status/download must share one legacy adoption before commit.');
assert.equal(lookupRace.recordWrites.at(-1).version, 'newmedia-newapp');

const evicted = harness();
const adopted = evicted.message('GET_OFFLINE_PACK_STATUS');
await adopted.work;
evicted.stores.get(OLD).delete(normalize(lazy('old')));
const missing = evicted.message('GET_OFFLINE_PACK_STATUS');
await missing.work;
assert.equal(missing.messages.at(-1).pack, null, 'A success record must not claim an evicted/incomplete cache is ready.');

const stalled = harness();
stalled.fail('stalled-body');
const stalledAttempt = stalled.message();
await settle();
assert.equal(stalled.timers.size, 1);
[...stalled.timers.values()][0].callback();
await stalledAttempt.work;
assert.equal(stalledAttempt.messages.at(-1).type, 'error');
stalled.fail(null);
const retry = stalled.message();
await retry.work;
assert.equal(retry.messages.at(-1).type, 'complete', 'A stalled body must release the update lock for retry.');

function mountControl() {
  const states = [], refs = [], effects = [], callbacks = [], timers = new Map(), requests = [], channels = [];
  let stateCursor = 0, refCursor = 0, effectCursor = 0, callbackCursor = 0, timerId = 0;
  const registration = deferred();
  class Channel {
    constructor() {
      this.port1 = { onmessage: null, close: () => { this.closed = true; } };
      this.port2 = { send: (data) => { if (!this.closed) this.port1.onmessage?.({ data }); } };
      channels.push(this);
    }
  }
  const react = {
    useState: (initial) => { const i = stateCursor++; if (!(i in states)) states[i] = initial; return [states[i], (value) => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef: (initial) => { const i = refCursor++; return refs[i] ||= { current: initial }; },
    useCallback: (callback) => { const i = callbackCursor++; return callbacks[i] ||= callback; },
    useEffect: (callback) => { const i = effectCursor++; if (!effects[i]) effects[i] = { callback }; },
  };
  const jsx = (type, props) => ({ type, props });
  const imports = { react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'lucide-react': { Check: 'Check', Download: 'Download', RefreshCw: 'RefreshCw' } };
  const source = ts.transpileModule(readFileSync('components/offline-pack-control.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, require: (name) => { assert.ok(Object.hasOwn(imports, name)); return imports[name]; }, MessageChannel: Channel,
    navigator: { serviceWorker: { ready: registration.promise } },
    fetch: async (url) => Response.json(url === '/offline-core.json' ? { version: 'media', assetCount: 3, totalBytes: 100 } : { version: 'app', assetCount: 5, totalBytes: 200 }),
    localStorage: { getItem: () => { throw new Error('Local storage is not cache evidence'); }, setItem: () => { throw new Error('Storage disabled'); } },
    setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; }, clearTimeout: (id) => timers.delete(id), Date,
  });
  const render = () => { stateCursor = refCursor = effectCursor = callbackCursor = 0; return exports.OfflinePackControl(); };
  render();
  for (const effect of effects) effect.cleanup = effect.callback();
  return {
    states, requests, channels, timers, render,
    attach: () => registration.resolve({ active: { postMessage: (data, ports) => requests.push({ data, port: ports[0] }) } }),
    unmount: () => effects.forEach((effect) => effect.cleanup?.()),
  };
}
const control = mountControl();
await settle();
const button = () => control.render().props.children.find((node) => node?.type === 'button');
button().props.onClick();
button().props.onClick();
control.attach();
await settle();
assert.equal(control.requests.filter((request) => request.data.type === 'DOWNLOAD_OFFLINE_PACK').length, 1, 'Two clicks before registration resolves must send only one update.');
const activeRequest = control.requests.at(-1);
activeRequest.port.send({ type: 'error', pack: { version: 'old', total: 6 } });
assert.equal(control.states[1].status, 'error');
assert.equal(control.render().props.children.find((node) => node?.type === 'h2').props.children, '离线行程已就绪');
assert.match(control.render().props.children.find((node) => node?.type === 'small').props.children, /之前的离线行程仍可用/);
button().props.onClick();
await settle();
assert.equal(control.requests.at(-1).data.type, 'DOWNLOAD_OFFLINE_PACK');
control.unmount();
assert.ok(control.channels.every((channel) => channel.closed));
assert.equal(control.timers.size, 0, 'Unmount must release message channels and timers.');
control.requests.at(-1).port.send({ type: 'complete', version: 'new', total: 7, totalBytes: 300 });
assert.equal(control.states[1].status, 'downloading', 'A disconnected page must ignore late completion.');

const unavailable = mountControl();
await settle();
[...unavailable.timers.values()][0].callback();
assert.equal(unavailable.states[1].status, 'error', 'Unavailable service worker must not leave an indefinite pending UI.');
unavailable.unmount();
console.log('Offline update boundary tests passed: shell v11/v12/v13 migration, migration quota retention and retry, unrecorded pending rejection, migration/download locking, retained HTML/bootstrap/lazy code, partial isolation, HTTP/HTML/quota failures, same-version retry, duplicate/reconnected clients, eviction, stalled body, component locks and cleanup. Model evidence only; external network offline is not tested.');
