import {
  CalendarClock,
  CheckSquare2,
  Clock3,
  Coffee,
  Footprints,
  MapPinned,
  Sparkles,
  TicketCheck,
  type LucideIcon,
} from 'lucide-react';
import type { TodaysTip } from '@/features/trip/tripPresentationModel';
import './todays-tips.css';

const icons: Record<TodaysTip['kind'], LucideIcon> = {
  fixed: CheckSquare2,
  booking: TicketCheck,
  arrival: CalendarClock,
  walking: Footprints,
  flex: Sparkles,
  meal: Coffee,
  route: MapPinned,
};

export function TodaysTipsCard({ tips }: { tips: TodaysTip[] }) {
  return <section className="workspace-tips" aria-labelledby="workspace-tips-heading">
    <header><span><Clock3 /></span><div><p>出发前快速确认</p><h2 id="workspace-tips-heading">Today&apos;s Tips</h2></div></header>
    <ul>
      {tips.map((tip) => {
        const Icon = icons[tip.kind];
        return <li key={tip.id}><i><Icon /></i><span>{tip.text}</span></li>;
      })}
    </ul>
  </section>;
}
