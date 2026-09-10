const SHELL_CACHE = 'europe-travel-os-shell-v9';
const OFFLINE_PREFIX = 'europe-travel-os-offline-';
const SHELL = ['/', '/?view=home', '/manifest.webmanifest', '/offline-core.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('europe-travel-os-shell-') && key !== SHELL_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'DOWNLOAD_OFFLINE_PACK') return;
  const port = event.ports[0];
  event.waitUntil((async () => {
    try {
      const manifest = await fetch(`/offline-core.json?v=${encodeURIComponent(event.data.version || Date.now())}`, { cache: 'reload' }).then((response) => response.json());
      const cacheName = `${OFFLINE_PREFIX}${manifest.version}`;
      const assets = [...new Set([...manifest.assets, ...(event.data.staticAssets || [])])];
      const cache = await caches.open(cacheName);
      let done = 0;
      for (const asset of assets) {
        if (!(await cache.match(asset))) {
          const response = await fetch(asset, { cache: 'reload' });
          if (!response.ok) throw new Error(`Unable to cache ${asset}`);
          await cache.put(asset, response);
        }
        port?.postMessage({ type: 'progress', done: ++done, total: assets.length });
      }
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith(OFFLINE_PREFIX) && key !== cacheName).map((key) => caches.delete(key)));
      port?.postMessage({ type: 'complete', total: assets.length, version: manifest.version, updatedAt: new Date().toISOString() });
    } catch (error) { port?.postMessage({ type: 'error', message: String(error) }); }
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone(); caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)); return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('/'))));
    return;
  }
  if (url.pathname.startsWith('/images/')) {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(SHELL_CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || Response.error()));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => {
    const update = fetch(request).then((response) => {
      if (response.ok) caches.open(SHELL_CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    });
    return cached || update;
  }));
});
