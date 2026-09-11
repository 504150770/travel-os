'use client';

import type { ReactNode } from 'react';
import { Undo2 } from 'lucide-react';
import { MediaGallery } from '@/features/media/MediaGallery';
import type { AppController } from '@/features/app/useAppController';
import { DesktopShell } from '@/components/shell/DesktopShell';
import { MobileShell } from '@/components/shell/MobileShell';

export function AppShell({ controller, children }: { controller: AppController; children: ReactNode }) {
  const { view, online, clock, navigate, actions, lightbox, setLightbox } = controller;
  return <div className="guide-v2">
    <DesktopShell view={view} online={online} clock={clock} navigate={navigate}>{children}</DesktopShell>
    <MobileShell view={view} navigate={navigate} />
    {actions.undo && <button className="undo-toast" onClick={actions.undoLast}><Undo2 />撤销：{actions.undo.label}</button>}
    <MediaGallery gallery={lightbox} close={() => setLightbox(null)} />
  </div>;
}
