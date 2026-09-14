import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  createMemoryRouteGeometryCache,
  geometryCacheKey,
} from '../features/map/routing/routeGeometryCache.ts';
import { resolveRouteGeometry, routableLegs, routeGeometryRequestKey, schematicGeometries } from '../features/map/routing/routingModel.ts';
import {
  approximateDistanceLabel,
  currentLocationFromCoordinates,
  initialLocationState,
  locationFailureMessage,
} from '../features/map/location/locationModel.ts';
import {
  buildDayGpx,
  buildOfflineMapManifest,
  OFFLINE_TILE_POLICY,
} from '../features/map/offline/offlineMapModel.ts';
import {
  FORECAST_HORIZON_DAYS,
  isFreshWeather,
  isWithinForecastHorizon,
  weatherCacheKey,
} from '../features/weather/weatherModel.ts';

const origin = { lat: 41.9009349, lng: 12.4786786 };
const destination = { lat: 41.89861, lng: 12.476873 };
const key = geometryCacheKey(origin, destination, 'foot');
assert.equal(key, geometryCacheKey({ lat: 41.90093491, lng: 12.47867859 }, destination, 'foot'));
assert.notEqual(key, geometryCacheKey(origin, destination, 'car'));
assert.notEqual(key, geometryCacheKey(destination, origin, 'foot'));
const cache = createMemoryRouteGeometryCache();
cache.set(key, { coordinates: [[41.9, 12.47], [41.89, 12.48]], provider: 'test', cachedAt: '2026-09-11T00:00:00Z' });
assert.equal(cache.get(key)?.provider, 'test');
assert.deepEqual(cache.stats(), { hits: 1, misses: 0, writes: 1 });
assert.equal(cache.get('missing'), undefined);
assert.deepEqual(cache.stats(), { hits: 1, misses: 1, writes: 1 });

const route = {
  legs: [
    { id: 'walk', fromId: 'hotel', toId: 'place', recommendedMode: 'Walk' },
    { id: 'transit', fromId: 'place', toId: 'station', recommendedMode: 'Transit' },
  ],
};
const points = [
  { id: 'hotel', kind: 'hotel', lat: 41.9, lng: 12.47 },
  { id: 'place', kind: 'stop', lat: 41.89, lng: 12.48 },
  { id: 'station', kind: 'stop', lat: 41.91, lng: 12.5 },
];
assert.deepEqual(routableLegs(route, points).map((item) => item.leg.id), ['walk']);
assert.deepEqual(schematicGeometries(route, points).map((item) => item.source), ['schematic', 'schematic']);
assert.equal(routeGeometryRequestKey(route, points), routeGeometryRequestKey(route, [...points, { id: 'food', kind: 'food', lat: 41.8, lng: 12.4 }]));
assert.deepEqual(routableLegs({ legs: [{ id: 'intercity', fromId: 'hotel', toId: 'far', recommendedMode: 'Walk' }] }, [...points, { id: 'far', kind: 'stop', lat: 48.85, lng: 2.35 }]), []);
const routable = routableLegs(route, points)[0];
let providerCalls = 0;
const provider = {
  id: 'test',
  route: async () => {
    providerCalls += 1;
    return { coordinates: [[41.9, 12.47], [41.895, 12.475], [41.89, 12.48]], provider: 'test' };
  },
};
const geometryCache = createMemoryRouteGeometryCache();
const loaded = await resolveRouteGeometry({ item: routable, key: 'walk-key', provider, cache: geometryCache });
const reused = await resolveRouteGeometry({ item: routable, key: 'walk-key', provider, cache: geometryCache });
assert.equal(loaded.source, 'routed');
assert.equal(reused.cached, true);
assert.equal(providerCalls, 1);
let concurrentCalls = 0;
const concurrentProvider = {
  id: 'concurrent-test',
  route: async () => {
    concurrentCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { coordinates: [[41.9, 12.47], [41.89, 12.48]], provider: 'concurrent-test' };
  },
};
const concurrentCache = createMemoryRouteGeometryCache();
await Promise.all([
  resolveRouteGeometry({ item: routable, key: 'same-pair', provider: concurrentProvider, cache: concurrentCache }),
  resolveRouteGeometry({ item: routable, key: 'same-pair', provider: concurrentProvider, cache: concurrentCache }),
]);
assert.equal(concurrentCalls, 1, 'identical in-flight route pairs must share one provider request');
assert.equal(concurrentCache.stats().misses, 2);
assert.equal(concurrentCache.stats().writes, 2);
const failed = await resolveRouteGeometry({
  item: routable,
  key: 'failed-key',
  provider: { id: 'fail', route: async () => { throw new Error('offline'); } },
  cache: geometryCache,
});
assert.equal(failed.source, 'schematic');
assert.equal(failed.coordinates.length, 2);

assert.equal(initialLocationState.status, 'idle');
assert.deepEqual(currentLocationFromCoordinates({ latitude: 41.9, longitude: 12.48, accuracy: 18 }), { lat: 41.9, lng: 12.48, accuracy: 18 });
assert.match(locationFailureMessage(1), /denied/i);
assert.match(locationFailureMessage(2), /unavailable/i);
assert.match(locationFailureMessage(3), /timed out/i);
assert.match(approximateDistanceLabel({ ...origin, accuracy: 10 }, destination), /away$/);

const manifest = buildOfflineMapManifest([
  { city: 'Rome', ...origin },
  { city: 'Rome', ...destination },
  { city: 'Paris', lat: 48.85, lng: 2.35 },
]);
assert.equal(manifest.length, 2);
assert.ok(manifest.every((item) => item.estimatedTiles > 0 && item.estimatedSizeMb > 0));
assert.equal(OFFLINE_TILE_POLICY.downloadAllowed, false);
assert.match(buildDayGpx('Rome & today', [{ name: 'A < B', ...origin }]), /Rome &amp; today/);

const now = new Date('2026-11-20T12:00:00Z');
assert.equal(FORECAST_HORIZON_DAYS, 16);
assert.equal(isWithinForecastHorizon('2026-11-20', now), true);
assert.equal(isWithinForecastHorizon('2026-12-05', now), true);
assert.equal(isWithinForecastHorizon('2026-12-06', now), false);
assert.equal(isWithinForecastHorizon('2026-11-19', now), false);
const cached = { updatedAt: '2026-11-20T10:00:00Z' };
assert.equal(isFreshWeather(cached, now), true);
assert.equal(isFreshWeather({ updatedAt: '2026-11-20T01:00:00Z' }, now), false);
assert.equal(weatherCacheKey({ date: '2026-12-01', lat: 41.9009, lng: 12.4787 }), '2026-12-01:41.901,12.479');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const locationHook = read('features/map/location/useCurrentLocation.ts');
const routeHook = read('features/map/routing/useRouteGeometry.ts');
const mapCanvas = read('components/map/MapCanvas.tsx');
const serviceWorker = read('public/sw.js');
assert.match(locationHook, /getCurrentPosition/);
assert.doesNotMatch(locationHook, /localStorage|sessionStorage|fetch\(/);
assert.match(routeHook, /REQUEST_INTERVAL_MS = 1050/);
assert.match(routeHook, /createBrowserRouteGeometryCache/);
assert.match(routeHook, /routeGeometryRequestKey/);
assert.match(mapCanvas, /source === 'routed'/);
assert.match(mapCanvas, /dashArray: '8 10'/);
assert.match(mapCanvas, /updateWhenIdle: true/);
assert.match(mapCanvas, /loading="lazy" decoding="async"/);
assert.doesNotMatch(serviceWorker, /tile\.openstreetmap\.org/);

console.log('Travel Intelligence tests passed: route cache hit/miss + in-flight dedupe, routed/schematic separation, progressive tile policy, location, offline manifest + GPX, and weather cache.');
