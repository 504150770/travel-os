'use client';

import { useEffect, useState } from 'react';
import type { DayRoute } from '@/lib/types';
import type { MapPoint } from '@/features/map/mapModel';
import { createBrowserRouteGeometryCache, geometryCacheKey } from '@/features/map/routing/routeGeometryCache';
import { fossgisOsrmProvider } from '@/features/map/routing/osrmProvider';
import { resolveRouteGeometry, routableLegs, schematicGeometries, type DisplayRouteGeometry } from '@/features/map/routing/routingModel';

const REQUEST_INTERVAL_MS = 1050;
const REQUEST_TIMEOUT_MS = 9000;

const wait = (milliseconds: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = window.setTimeout(resolve, milliseconds);
  signal.addEventListener('abort', () => {
    window.clearTimeout(timer);
    reject(new DOMException('Aborted', 'AbortError'));
  }, { once: true });
});

export type RouteGeometryState = {
  geometries: DisplayRouteGeometry[];
  status: 'loading' | 'routed' | 'cached' | 'fallback';
};

export function useRouteGeometry(route: DayRoute, points: MapPoint[]): RouteGeometryState {
  const requestKey = JSON.stringify({
    day: route.day,
    legs: route.legs.map(({ id, fromId, toId, recommendedMode }) => ({ id, fromId, toId, recommendedMode })),
    points: points.map(({ id, lat, lng }) => ({ id, lat, lng })),
  });
  const [state, setState] = useState<RouteGeometryState & { requestKey: string }>(() => ({
    requestKey,
    geometries: schematicGeometries(route, points),
    status: 'loading',
  }));

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      const cache = createBrowserRouteGeometryCache();
      const routable = routableLegs(route, points);
      const base = schematicGeometries(route, points);
      const byLeg = new Map(base.map((item) => [item.legId, item]));
      const missing = [] as typeof routable;
      let cached = 0;
      routable.forEach((item) => {
        const hit = cache.get(geometryCacheKey(item.origin, item.destination, item.profile));
        if (hit) {
          cached += 1;
          byLeg.set(item.leg.id, { legId: item.leg.id, coordinates: hit.coordinates, source: 'routed', cached: true, provider: hit.provider });
        } else missing.push(item);
      });
      setState({ requestKey, geometries: [...byLeg.values()], status: missing.length ? 'loading' : cached ? 'cached' : 'fallback' });
      let routed = 0;
      for (let index = 0; index < missing.length; index += 1) {
        if (index > 0) {
          try { await wait(REQUEST_INTERVAL_MS, controller.signal); }
          catch { return; }
        }
        const item = missing[index];
        const requestController = new AbortController();
        const stopRequest = () => requestController.abort();
        controller.signal.addEventListener('abort', stopRequest, { once: true });
        const timeout = window.setTimeout(() => requestController.abort(), REQUEST_TIMEOUT_MS);
        try {
          const geometry = await resolveRouteGeometry({
            item,
            key: geometryCacheKey(item.origin, item.destination, item.profile),
            provider: fossgisOsrmProvider,
            cache,
            signal: requestController.signal,
          });
          byLeg.set(item.leg.id, geometry);
          if (geometry.source === 'routed') routed += 1;
        } finally {
          window.clearTimeout(timeout);
          controller.signal.removeEventListener('abort', stopRequest);
        }
        if (controller.signal.aborted) return;
        setState({ requestKey, geometries: [...byLeg.values()], status: routed ? 'routed' : cached ? 'cached' : 'fallback' });
      }
      if (!missing.length || controller.signal.aborted) return;
      setState({ requestKey, geometries: [...byLeg.values()], status: routed ? 'routed' : cached ? 'cached' : 'fallback' });
    };
    void run();
    return () => controller.abort();
  }, [points, requestKey, route]);

  return state.requestKey === requestKey
    ? state
    : { geometries: schematicGeometries(route, points), status: 'loading' };
}
