const SHELL_CACHE = 'europe-travel-os-shell-v12';
const OFFLINE_PREFIX = 'europe-travel-os-offline-';
const PACK_METADATA_CACHE = 'europe-travel-os-pack-metadata-v1';
const PACK_RECORD = '/__offline-pack-ready__';
const SHELL = ['/', '/?view=home', '/manifest.webmanifest', '/offline-core.json'];
let downloadJob = null;
let legacyLookup = null;
let attempt = 0;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await readyPack();
    const metadata = await caches.open(PACK_METADATA_CACHE);
    const record = await metadata.match(PACK_RECORD);
    const migrated = record && await validatedRecord(record);
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('europe-travel-os-shell-') && key !== SHELL_CACHE).map(async (key) => {
      // If stable publication failed, retain the shell holding the old pointer.
      const old = await caches.open(key);
      if (!migrated && await old.match(PACK_RECORD)) return;
      await caches.delete(key);
    }));
    await self.clients.claim();
  })());
});

const post = (port, message) => {
  // Leaving the page must not abort the worker's cache transaction.
  try { port?.postMessage(message); } catch { /* disconnected page */ }
};
const manifestAssets = (manifest) => {
  if (!manifest || typeof manifest.version !== 'string' || !Array.isArray(manifest.assets) || !manifest.assets.length) throw new Error('Invalid offline manifest');
  return manifest.assets.map((asset) => {
    if (typeof asset !== 'string' || !asset.startsWith('/') || asset.startsWith('//')) throw new Error('Invalid offline asset');
    return asset;
  });
};
const validateShell = async (cache, app) => {
  const response = await cache.match('/');
  if (!response?.headers.get('content-type')?.includes('text/html')) throw new Error('Offline application shell unavailable');
  const html = await response.text();
  const code = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)]
    .map((match) => new URL(match[1], self.location.origin))
    .filter((url) => url.origin === self.location.origin && url.pathname.startsWith('/_next/static/'))
    .map((url) => url.pathname);
  if (!code.some((asset) => asset.endsWith('.js')) || code.some((asset) => !app.assets.includes(asset)) || (app.entry && !code.includes(app.entry))) throw new Error('Offline HTML and application manifest do not match');
};

async function readyPack(checkContents = true) {
  const metadata = await caches.open(PACK_METADATA_CACHE);
  const record = await metadata.match(PACK_RECORD);
  if (record) return validatedRecord(record, checkContents);
  // Activation, status queries and downloads share migration/adoption work.
  // The downloader awaits this promise before publishing a newer pointer.
  if (!legacyLookup) legacyLookup = migratePackRecord(metadata).finally(() => { legacyLookup = null; });
  return legacyLookup;
}

async function completePack(cacheName) {
  const cache = await caches.open(cacheName);
  const mediaResponse = await cache.match('/offline-core.json');
  const appResponse = await cache.match('/_next/static/offline-app.json');
  if (!mediaResponse || !appResponse) return null;
  const media = await mediaResponse.json();
  const app = await appResponse.json();
  const assets = [...new Set([...manifestAssets(media), ...manifestAssets(app)])];
  if (!(await Promise.all(assets.map((asset) => cache.match(asset)))).every(Boolean)) return null;
  await validateShell(cache, app);
  return { cacheName, assets, version: `${media.version}-${app.version}`, total: assets.length, totalBytes: (media.totalBytes || 0) + (app.totalBytes || 0) };
}

async function validatedRecord(record, checkContents = true) {
  try {
    const pack = await record.json();
    if (typeof pack?.cacheName !== 'string' || !pack.cacheName.startsWith(OFFLINE_PREFIX) || !Array.isArray(pack.assets) || !pack.assets.length || !(await caches.keys()).includes(pack.cacheName)) return null;
    if (!checkContents) return pack;
    const complete = await completePack(pack.cacheName);
    if (!complete || complete.version !== pack.version || complete.assets.length !== pack.assets.length || pack.assets.some((asset) => !complete.assets.includes(asset))) return null;
    return { ...pack, ...complete };
  } catch { return null; }
}

async function migratePackRecord(metadata) {
  // Only a validated published shell pointer can admit a pending-named pack.
  const shells = (await caches.keys()).filter((key) => key.startsWith('europe-travel-os-shell-')).reverse();
  for (const key of shells) {
    const shell = await caches.open(key);
    const record = await shell.match(PACK_RECORD);
    const pack = record && await validatedRecord(record);
    if (!pack) continue;
    try { await metadata.put(PACK_RECORD, Response.json(pack)); } catch { /* keep the published old shell pointer */ }
    return pack;
  }
  return adoptLegacyPack(metadata);
}

async function adoptLegacyPack(metadata) {
  // Previous workers had no commit record. Adopt only complete legacy packs;
  // pending caches from failed updates must never be used as a fallback.
  const keys = (await caches.keys()).filter((key) => key.startsWith(OFFLINE_PREFIX) && !key.includes('-pending-')).reverse();
  for (const cacheName of keys) {
    try {
      const pack = await completePack(cacheName);
      if (!pack) continue;
      // A metadata quota error must not make a verified existing pack unusable.
      try { await metadata.put(PACK_RECORD, Response.json(pack)); } catch { /* retry adoption on the next lookup */ }
      return pack;
    } catch { /* not a complete legacy pack */ }
  }
  return null;
}

async function packedResponse(request) {
  const pack = await readyPack(false);
  if (!pack) return null;
  const cache = await caches.open(pack.cacheName);
  const response = await cache.match(request);
  if (response) return response;
  // An already open page may still request lazy modules from the preceding
  // build after a successful update. Its hashed code remains available.
  const url = new URL(typeof request === 'string' ? request : request.url, self.location.origin);
  if (pack.previousCacheName && url.pathname.startsWith('/_next/static/') && (await caches.keys()).includes(pack.previousCacheName)) {
    return (await caches.open(pack.previousCacheName)).match(request);
  }
  return null;
}

async function fetchAsset(asset) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(asset, { cache: 'reload', signal: controller.signal });
    if (!response.ok) throw new Error(`Unable to cache ${asset}`);
    // Keep the timeout active while consuming a stalled response body.
    const headers = new Headers(response.headers);
    // Fetch has decoded transfer encodings before exposing the response body.
    headers.delete('content-encoding');
    headers.delete('content-length');
    return new Response(await response.blob(), { status: response.status, headers });
  } finally { clearTimeout(timer); }
}

self.addEventListener('message', (event) => {
  const type = event.data?.type;
  if (type !== 'DOWNLOAD_OFFLINE_PACK' && type !== 'GET_OFFLINE_PACK_STATUS') return;
  const port = event.ports[0];
  if (downloadJob) {
    downloadJob.ports.add(port);
    post(port, downloadJob.progress);
    event.waitUntil(downloadJob.work);
    return;
  }
  if (type === 'GET_OFFLINE_PACK_STATUS') {
    event.waitUntil(readyPack().then((pack) => post(port, { type: 'status', pack })).catch((error) => post(port, { type: 'error', message: String(error) })));
    return;
  }
  const job = { ports: new Set([port]), progress: { type: 'progress', done: 0, total: 0 }, work: null };
  downloadJob = job;
  const broadcast = (message) => { job.progress = message; for (const subscriber of job.ports) post(subscriber, message); };
  job.work = (async () => {
    let cacheName;
    let committed = false;
    try {
      // Finish adoption of a legacy ready pack before creating the new attempt.
      const previous = await readyPack();
      const mediaResponse = await fetchAsset('/offline-core.json');
      const appResponse = await fetchAsset('/_next/static/offline-app.json');
      const media = await mediaResponse.clone().json();
      const app = await appResponse.clone().json();
      const version = `${media.version}-${app.version}`;
      const assets = [...new Set([...manifestAssets(media), ...manifestAssets(app)])];
      cacheName = `${OFFLINE_PREFIX}${version}-pending-${Date.now()}-${++attempt}`;
      const cache = await caches.open(cacheName);
      let done = 0;
      for (const asset of assets) {
        const response = asset === '/offline-core.json' ? mediaResponse.clone() : asset === '/_next/static/offline-app.json' ? appResponse.clone() : await fetchAsset(asset);
        await cache.put(asset, response);
        broadcast({ type: 'progress', done: ++done, total: assets.length });
      }
      await validateShell(cache, app);
      // Publish HTML and its assets through one record. Online navigation cache
      // writes cannot replace the old offline shell when an update fails.
      const previousCacheName = previous?.version === version ? previous.previousCacheName : previous?.cacheName;
      const pack = { cacheName, previousCacheName, assets, version, total: assets.length, updatedAt: new Date().toISOString(), totalBytes: (media.totalBytes || 0) + (app.totalBytes || 0) };
      const metadata = await caches.open(PACK_METADATA_CACHE);
      await metadata.put(PACK_RECORD, Response.json(pack));
      committed = true;
      broadcast({ type: 'complete', ...pack });
      const keys = await caches.keys();
      await Promise.allSettled(keys.filter((key) => key.startsWith(OFFLINE_PREFIX) && key !== cacheName && key !== previousCacheName).map((key) => caches.delete(key)));
    } catch (error) {
      if (!committed) {
        if (cacheName) { try { await caches.delete(cacheName); } catch { /* excluded until later cleanup */ } }
        let pack = null;
        try { pack = await readyPack(); } catch { /* unavailable storage */ }
        broadcast({ type: 'error', message: String(error), pack });
      }
    } finally { downloadJob = null; }
  })();
  event.waitUntil(job.work);
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/offline-core.json' || url.pathname === '/_next/static/offline-app.json') {
    event.respondWith(fetch(request).then((response) => {
      if (!response.ok) throw new Error('Offline manifest unavailable');
      const copy = response.clone();
      event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.put(url.pathname, copy)));
      return response;
    }).catch(async () => (await packedResponse(url.pathname)) || (await (await caches.open(SHELL_CACHE)).match(url.pathname)) || Response.error()));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      if (!response.ok) throw new Error('Navigation unavailable');
      const copy = response.clone(); event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy))); return response;
    }).catch(async () => {
      const pack = await packedResponse('/');
      if (pack) return pack;
      const shell = await caches.open(SHELL_CACHE);
      return (await shell.match(request)) || (await shell.match('/')) || Response.error();
    }));
    return;
  }
  if (url.pathname.startsWith('/images/')) {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.put(request, response.clone())));
      return response;
    }).catch(async () => (await packedResponse(request)) || (await (await caches.open(SHELL_CACHE)).match(request)) || Response.error()));
    return;
  }
  event.respondWith((async () => {
    const shell = await caches.open(SHELL_CACHE);
    const cached = (await packedResponse(request)) || (await shell.match(request));
    const update = fetch(request).then((response) => {
      if (response.ok) event.waitUntil(shell.put(request, response.clone()));
      return response;
    }).catch(() => cached || Response.error());
    event.waitUntil(update.then(() => undefined));
    return cached || update;
  })());
});
