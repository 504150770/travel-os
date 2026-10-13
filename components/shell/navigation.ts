import { Home, Menu, Route, Search, TicketCheck } from 'lucide-react';
import type { ViewId } from '@/lib/types';

export const NAV_ITEMS: { id: ViewId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: '概览', icon: Home },
  { id: 'trip', label: '行程', icon: Route },
  { id: 'discover', label: '探索', icon: Search },
  { id: 'plan', label: '订单与准备', icon: TicketCheck },
  { id: 'more', label: '旅行资料', icon: Menu },
];
