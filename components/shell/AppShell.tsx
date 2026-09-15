'use client';

import type { ReactNode } from 'react';
import { Undo2 } from 'lucide-react';
import { MediaGallery } from '@/features/media/MediaGallery';
import type { AppController } from '@/features/app/useAppController';
import { DesktopShell } from '@/components/shell/DesktopShell';
import { MobileShell } from '@/components/shell/MobileShell';
import { useMobileViewport } from '@/components/shell/useMobileViewport';
import { todayDay } from '@/features/trip/tripModel';

export function AppShell({ controller, children }: { controller: AppController; children: ReactNode }) {
  const isMobile = useMobileViewport();
  const { view, online, clock, navigate, actions, lightbox, setLightbox } = controller;
  return <div className={`guide-v2 ${isMobile ? 'mobile-runtime' : 'desktop-runtime'}`}>
    {isMobile && view === 'home' ? (
      <div className="mobile-home-shell">
        <header className="mobile-home-header">
          <button onClick={() => navigate('home')}><b>Travel OS</b><span>Europe 2026</span></button>
          <div><span>D{todayDay(clock ?? new Date())}</span><i className={online ? 'online' : 'offline'} /><b>{online ? 'Saved' : 'Offline'}</b></div>
        </header>
        <main>{children}</main>
      </div>
    ) : isMobile ? (
      <MobileShell controller={controller} />
    ) : (
      <DesktopShell view={view} online={online} clock={clock} navigate={navigate}>{children}</DesktopShell>
    )}
    {actions.undo && <button className="undo-toast" onClick={actions.undoLast}><Undo2 />撤销：{actions.undo.label}</button>}
    <MediaGallery gallery={lightbox} close={() => setLightbox(null)} />
  </div>;
}
