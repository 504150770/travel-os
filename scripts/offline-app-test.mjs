import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import vm from 'node:vm';
import sharp from 'sharp';
import { generateOfflineAppManifest } from './generate-offline-app.mjs';

const originalHero = await sharp('public/images/home-eiffel-winter-sunset.png').raw().toBuffer({ resolveWithObject: true });
const compressedHero = await sharp('public/images/home-eiffel-winter-sunset-lossless.webp').raw().toBuffer({ resolveWithObject: true });
assert.deepEqual(compressedHero.info, originalHero.info);
assert.ok(compressedHero.data.equals(originalHero.data), 'Performance encoding must preserve every original image pixel.');

const root = mkdtempSync(join(tmpdir(), 'travel-offline-app-'));
try {
  const chunks = join(root, '_next/static/chunks');
  mkdirSync(chunks, { recursive: true });
  writeFileSync(join(chunks, 'entry.js'), 'entry');
  writeFileSync(join(chunks, 'unvisited-mobile.js'), 'lazy UI');
  writeFileSync(join(chunks, 'styles.css'), 'css');
  writeFileSync(join(chunks, 'debug.js.map'), 'excluded');
  const first = generateOfflineAppManifest(root);
  assert.ok(first.assets.includes('/_next/static/chunks/unvisited-mobile.js'));
  assert.ok(first.assets.includes('/_next/static/chunks/styles.css'));
  assert.ok(first.assets.includes('/'));
  assert.ok(first.assets.every((url) => (url === '/' || url.startsWith('/_next/static/')) && !url.endsWith('.map')));
  assert.deepEqual(generateOfflineAppManifest(root), first, 'Generated manifest must not hash itself.');
  writeFileSync(join(chunks, 'unvisited-mobile.js'), 'changed lazy UI');
  assert.notEqual(generateOfflineAppManifest(root).version, first.version, 'Lazy code changes invalidate the pack.');
  writeFileSync(join(root, 'vinext-client-entry-manifest.json'), JSON.stringify({ appBrowserEntry: '_next/static/chunks/entry.js' }));
  const entryManifest = generateOfflineAppManifest(root);
  assert.equal(entryManifest.entry, '/_next/static/chunks/entry.js');
  writeFileSync(join(root, 'vinext-client-entry-manifest.json'), JSON.stringify({ appBrowserEntry: '_next/static/chunks/unvisited-mobile.js' }));
  assert.notEqual(generateOfflineAppManifest(root).version, entryManifest.version, 'Changing the bootstrap selection invalidates the pack even if static file bytes are unchanged.');
  writeFileSync(join(root, 'vinext-client-entry-manifest.json'), JSON.stringify({ appBrowserEntry: '_next/static/chunks/missing.js' }));
  assert.throws(() => generateOfflineAppManifest(root), /entry is missing/);
  writeFileSync(join(root, 'vinext-client-entry-manifest.json'), JSON.stringify({ appBrowserEntry: '_next/static/chunks/entry.js' }));
  mkdirSync(join(root, 'images'));
  writeFileSync(join(root, 'images', 'shell.webp'), 'shell');
  assert.ok(generateOfflineAppManifest(root, ['/images/shell.webp']).assets.includes('/images/shell.webp'));
  assert.throws(() => generateOfflineAppManifest(root, ['/images/missing.webp']), 'Missing shell asset must fail the build.');
} finally {
  // Exact owned mkdtemp directory, never a user export or browser cache.
  assert.equal(dirname(resolve(root)), resolve(tmpdir()));
  assert.ok(basename(root).startsWith('travel-offline-app-'));
  rmSync(root, { recursive: true, force: true });
}

// Execute the actual worker: a lazy module absent from runtime resource entries
// still gets cached, and an incomplete update cannot discard the old ready pack.
const listeners = new Map();
const stores = new Map([['europe-travel-os-offline-old', new Map([['/old.js', new Response('old')]])]]);
let failLazy = false;
let networkDown = false;
const media = { version: 'media', assets: ['/image.webp', '/offline-core.json'] };
const app = { version: 'app', assets: ['/_next/static/chunks/unvisited-mobile.js', '/', '/_next/static/offline-app.json'] };
const freshHtml = '<html><script type="module" src="/_next/static/chunks/unvisited-mobile.js"></script></html>';
const fetch = async (input) => {
  if (networkDown) throw new Error('Offline');
  const url = typeof input === 'string' ? input : new URL(input.url).pathname;
  if (url.startsWith('/offline-core.json')) return Response.json(media);
  if (url === '/_next/static/offline-app.json') return Response.json(app);
  if (failLazy && url === app.assets[0]) throw new Error('Offline');
  if (url === '/') return new Response(freshHtml, { headers: { 'content-type': 'text/html' } });
  return new Response('asset');
};
const caches = {
  keys: async () => [...stores.keys()],
  delete: async (key) => stores.delete(key),
  open: async (key) => {
    if (!stores.has(key)) stores.set(key, new Map());
    const store = stores.get(key);
    return { match: async (url) => store.get(url)?.clone(), put: async (url, response) => store.set(url, response.clone()), keys: async () => [...store.keys()], delete: async (url) => store.delete(url) };
  },
};
vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), {
  self: { location: { origin: 'https://qa.example' }, addEventListener: (type, callback) => listeners.set(type, callback) },
  caches, fetch, Response, Headers, URL, Date, Set, AbortController, setTimeout, clearTimeout,
});
const download = async () => {
  const messages = [];
  let work = Promise.resolve();
  listeners.get('message')({ data: { type: 'DOWNLOAD_OFFLINE_PACK', staticAssets: [] }, ports: [{ postMessage: (message) => messages.push(message) }], waitUntil: (promise) => { work = promise; } });
  await work;
  return messages;
};
failLazy = true;
stores.set('europe-travel-os-shell-v11', new Map([['/?view=today', new Response('old bootstrap HTML', { headers: { 'content-type': 'text/html' } })]]));
assert.equal((await download()).at(-1).type, 'error');
assert.ok(stores.has('europe-travel-os-offline-old'));
assert.ok(stores.get('europe-travel-os-shell-v11').has('/?view=today'));
failLazy = false;
const complete = (await download()).at(-1);
assert.equal(complete.type, 'complete');
assert.equal(complete.version, 'media-app');
const pack = await stores.get('europe-travel-os-pack-metadata-v1').get('/__offline-pack-ready__').clone().json();
assert.ok(stores.get(pack.cacheName).has(app.assets[0]));
assert.ok(!stores.has('europe-travel-os-offline-old'));
assert.equal(await stores.get(pack.cacheName).get('/').clone().text(), freshHtml);
networkDown = true;
let navigationResponse = Promise.resolve(Response.error());
listeners.get('fetch')({
  request: { method: 'GET', mode: 'navigate', url: 'https://qa.example/?view=today&day=15' },
  respondWith: (response) => { navigationResponse = response; },
  waitUntil: () => {},
});
assert.equal(await (await navigationResponse).text(), freshHtml, 'Unvisited dates must use the committed bootstrap shell.');
console.log('Offline app tests passed: unvisited lazy code and navigation, content-version changes, worker download and failed-update retention.');
