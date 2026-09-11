import { Home, Menu, Route, Search, TicketCheck } from 'lucide-react';
import type { ViewId } from '@/lib/types';

export const NAV_ITEMS: { id: ViewId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'trip', label: 'Trip', icon: Route },
  { id: 'discover', label: 'Discover', icon: Search },
  { id: 'plan', label: 'Plan', icon: TicketCheck },
  { id: 'more', label: 'More', icon: Menu },
];
