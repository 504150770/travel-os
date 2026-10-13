const SHELL_CACHE = 'europe-travel-os-shell-v11';
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
      const appManifestResponse = await fetch('/_next/static/offline-app.json', { cache: 'reload' });
      if (!appManifestResponse.ok) throw new Error('Application offline manifest unavailable');
      const appManifest = await appManifestResponse.json();
      const version = `${manifest.version}-${appManifest.version}`;
      const cacheName = `${OFFLINE_PREFIX}${version}`;
      const assets = [...new Set([...manifest.assets, ...appManifest.assets, ...(event.data.staticAssets || [])])];
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
      // HTML embeds hashed bootstrap modules. Replace old navigation variants
      // only after the complete new code pack and its matching shell are saved.
      const shell = await caches.open(SHELL_CACHE);
      const freshHtml = await cache.match('/');
      if (!freshHtml) throw new Error('Offline application shell unavailable');
      await shell.put('/', freshHtml.clone());
      for (const request of await shell.keys()) {
        const path = typeof request === 'string' ? request : request.url;
        if (new URL(path, self.location.origin).pathname === '/' && !new URL(path, self.location.origin).search) continue;
        const saved = await shell.match(request);
        if (saved?.headers.get('content-type')?.includes('text/html')) await shell.delete(request);
      }
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith(OFFLINE_PREFIX) && key !== cacheName).map((key) => caches.delete(key)));
      port?.postMessage({ type: 'complete', total: assets.length, version, updatedAt: new Date().toISOString() });
    } catch (error) { port?.postMessage({ type: 'error', message: String(error) }); }
  })());
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
    }).catch(async () => (await caches.match(url.pathname)) || Response.error()));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      if (!response.ok) throw new Error('Navigation unavailable');
      const copy = response.clone(); event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy))); return response;
    }).catch(async () => {
      const shell = await caches.open(SHELL_CACHE);
      return (await shell.match(request)) || (await shell.match('/')) || Response.error();
    }));
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
    }).catch(() => cached || Response.error());
    return cached || update;
  }));
});
