'use client';

import { lazy, Suspense, useEffect, useState } from 'react';
import type { DesktopTripWorkspaceProps } from '@/views/trip/DesktopTripWorkspace';
import { preloadMapCanvas } from '@/features/map/mapLoader';

const loadDesktopTripWorkspace = () => import('@/views/trip/DesktopTripWorkspace');
const DesktopTripWorkspace = lazy(loadDesktopTripWorkspace);

export const preloadTripWorkspace = () => Promise.all([
  loadDesktopTripWorkspace(),
  preloadMapCanvas(),
]).then(() => undefined);

export function PersistentTripView({ active, ...props }: DesktopTripWorkspaceProps & { active: boolean }) {
  const [visited, setVisited] = useState(active);

  useEffect(() => {
    if (!active || visited) return;
    const timer = globalThis.setTimeout(() => setVisited(true), 0);
    return () => globalThis.clearTimeout(timer);
  }, [active, visited]);

  useEffect(() => {
    const preload = () => { void preloadTripWorkspace(); };
    const idleWindow = window as unknown as {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const request = idleWindow.requestIdleCallback(preload, { timeout: 1800 });
      return () => idleWindow.cancelIdleCallback?.(request);
    }
    const timer = globalThis.setTimeout(preload, 700);
    return () => globalThis.clearTimeout(timer);
  }, []);

  return active || visited ? <div className="view-transition" hidden={!active}><TripView {...props} /></div> : null;
}

export function TripView(props: DesktopTripWorkspaceProps) {
  return (
    <Suspense
      fallback={
        <div className="desktop-workspace-loading">
          <span>TRIP WORKSPACE</span>
          <b>Preparing your day plan…</b>
        </div>
      }
    >
      <DesktopTripWorkspace {...props} />
    </Suspense>
  );
}
