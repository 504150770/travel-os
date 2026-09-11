import type { ReactNode } from 'react';
import type { ViewId } from '@/lib/types';
import { todayDay } from '@/features/trip/tripModel';
import { NAV_ITEMS } from '@/components/shell/navigation';

export function DesktopShell({ view, online, clock, navigate, children }: {
  view: ViewId; online: boolean; clock: Date | null;
  navigate: (view: ViewId) => void; children: ReactNode;
}) {
  return <>
    <header className="side-nav">
      <button className="v2-brand" onClick={() => navigate('home')}><b>Travel OS</b><span>Europe 2026</span></button>
      <nav>{NAV_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => navigate(id)}><Icon /><span>{label}</span></button>)}</nav>
      <div className="side-meta"><span>D{todayDay(clock ?? new Date())}</span><i className={online ? 'online' : 'offline'} /><b>{online ? 'Saved' : 'Offline'}</b></div>
    </header>
    <main className="v2-main">
      <header className="v2-topbar">
        <div><span>EUROPE 2026</span><b>{NAV_ITEMS.find((item) => item.id === view)?.label}</b></div>
        <p>18 days · 6 cities · Dec 1–18</p>
        <span className={online ? 'connectivity online' : 'connectivity offline'}>{online ? '在线 · 本机保存' : '离线 · 已缓存内容可用'}</span>
      </header>
      {children}
    </main>
  </>;
}
