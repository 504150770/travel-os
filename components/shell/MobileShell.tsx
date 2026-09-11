import type { ViewId } from '@/lib/types';
import { NAV_ITEMS } from '@/components/shell/navigation';

/** Phase 1 mobile boundary; presentation intentionally remains unchanged. */
export function MobileShell({ view, navigate }: { view: ViewId; navigate: (view: ViewId) => void }) {
  return <nav className="bottom-nav">
    {NAV_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => navigate(id)}><Icon /><span>{label}</span></button>)}
  </nav>;
}
