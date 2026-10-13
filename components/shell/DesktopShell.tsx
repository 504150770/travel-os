import type { ReactNode } from 'react';
import type { ViewId } from '@/lib/types';
import { NAV_ITEMS } from '@/components/shell/navigation';
import { PersonalMenu } from '@/components/shell/PersonalMenu';

export function DesktopShell({ view, online, navigate, openBackup, openSettings, children }: {
  view: ViewId; online: boolean;
  navigate: (view: ViewId) => void; openBackup: () => void; openSettings: () => void; children: ReactNode;
}) {
  return <>
    <header className="side-nav">
      <button className="v2-brand" onClick={() => navigate('home')} aria-label="Jacob Travel 概览"><span className="brand-mark" aria-hidden="true">J</span><div><b>Jacob Travel</b><small>Europe 2026</small></div></button>
      <nav aria-label="主要导航">{NAV_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} aria-current={view === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon /><span>{label}</span></button>)}</nav>
      <PersonalMenu online={online} openBackup={openBackup} openSettings={openSettings} />
    </header>
    <main className="v2-main">
      {children}
    </main>
  </>;
}
