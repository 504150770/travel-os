'use client';

import { lazy, Suspense } from 'react';
import type { DesktopTripWorkspaceProps } from '@/views/trip/DesktopTripWorkspace';

const DesktopTripWorkspace = lazy(() => import('@/views/trip/DesktopTripWorkspace'));

export function TripView(props: DesktopTripWorkspaceProps) {
  return (
    <Suspense
      fallback={
        <div className="desktop-workspace-loading">
          <span>TRIP WORKSPACE</span>
          <b>Preparing your day plan and map…</b>
        </div>
      }
    >
      <DesktopTripWorkspace {...props} />
    </Suspense>
  );
}
