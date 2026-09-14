import type { ActionItem } from '@/lib/action-queue';
import type { Booking } from '@/lib/types';
import type { DocumentMetadata } from '@/features/documents/documentModel';
import type { PackingItem } from '@/features/packing/packingModel';

export type ReadinessSection = 'action' | 'before' | 'waiting' | 'ready';
export type ReadinessPriority = 'P0' | 'P1' | 'Comfort';
export type ReadinessItem = {
  id: string;
  title: string;
  detail: string;
  when: string;
  section: ReadinessSection;
  priority: ReadinessPriority;
  source: 'action' | 'packing' | 'document';
  actionId?: string;
  packingId?: string;
  bookingId?: string;
  target?: ActionItem['target'];
};

export const PACKING_REMINDER_DAYS = 14;
export const DOCUMENT_REMINDER_DAYS = 30;

const parseDue = (value: string, fallbackYear: number) => {
  const iso = value.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  const short = value.match(/(?:^|\D)(\d{2})\/(\d{2})(?:\D|$)/);
  const parsed = iso ? new Date(`${iso}T23:59:59`) : short
    ? new Date(`${fallbackYear}-${short[1]}-${short[2]}T23:59:59`)
    : null;
  return parsed && Number.isFinite(parsed.getTime()) ? parsed : null;
};
const daysBetween = (from: Date, to: Date) => Math.ceil((to.getTime() - from.getTime()) / 86400000);
const isDone = (status: string) => ['Done', 'Skipped', 'Completed'].includes(status);

const actionPriority = (item: ActionItem): ReadinessPriority => {
  if (/quiet|静音|menu|shopping|餐厅|圣诞营业/i.test(`${item.id} ${item.title}`)) return 'Comfort';
  if (
    /visa|transport-international|transport-europe|ticket-|flight-checkin|票/i.test(`${item.id} ${item.title}`) ||
    (item.source === 'checkin' && item.priority === 'Critical')
  ) return 'P0';
  return 'P1';
};

const documentCategoryFor = (booking: Booking) => {
  if (booking.id.startsWith('booking-stay-')) return 'Hotel confirmation';
  if (/铁路/.test(booking.category)) return 'Train ticket';
  if (/机票|航班/.test(booking.category)) return 'Flight ticket';
  if (/景点票/.test(booking.category)) return 'Attraction ticket';
  if (/保险/.test(booking.category)) return 'Insurance';
  return null;
};

export function buildReadiness({
  now, tripStart, actions, bookings, packing, documents, privateLinks,
}: {
  now: Date;
  tripStart: string;
  actions: ActionItem[];
  bookings: Booking[];
  packing: PackingItem[];
  documents: DocumentMetadata[];
  privateLinks: Record<string, string>;
}) {
  const items: ReadinessItem[] = [];
  const year = new Date(`${tripStart}T00:00:00`).getFullYear();
  const tripDate = new Date(`${tripStart}T00:00:00`);
  const daysToTrip = daysBetween(now, tripDate);

  for (const item of actions) {
    const due = parseDue(item.due, year);
    const daysToDue = due ? daysBetween(now, due) : null;
    const complete = isDone(item.status);
    const needsExternalLink = item.source === 'checkin' && item.hotelId &&
      ['Waiting', 'Required'].includes(item.status) && !privateLinks[item.hotelId];
    let section: ReadinessSection;
    if (complete) section = 'ready';
    else if (needsExternalLink && (daysToDue == null || daysToDue > 0)) section = 'waiting';
    else if (item.status === 'Waiting' && (daysToDue == null || daysToDue > 0) && !(item.hotelId && privateLinks[item.hotelId])) section = 'waiting';
    else if (daysToDue != null && daysToDue <= 14) section = 'action';
    else section = 'before';
    items.push({
      id: `readiness:${item.id}`,
      title: item.title,
      detail: item.detail,
      when: due ? (daysToDue != null && daysToDue <= 0 ? `Due ${item.due}` : `When · ${item.due}`) : `Before departure · ${item.due}`,
      section,
      priority: actionPriority(item),
      source: 'action', actionId: item.id, target: item.target,
    });
  }

  const completedStatuses = new Set(['Ticketed', 'Booked', 'Paid', 'Confirmed', 'Completed']);
  for (const booking of bookings) {
    const requiredCategory = documentCategoryFor(booking);
    if (!requiredCategory || !completedStatuses.has(booking.status)) continue;
    const hasDocument = documents.some((document) => document.bookingId === booking.id);
    items.push({
      id: `document:${booking.id}`,
      title: hasDocument ? `${booking.title} document saved` : `Add ${booking.title} document`,
      detail: hasDocument ? 'Available offline on this device.' : `${requiredCategory} is not yet in the local vault.`,
      when: daysToTrip <= DOCUMENT_REMINDER_DAYS ? 'Before departure' : `Before ${tripStart}`,
      section: hasDocument ? 'ready' : daysToTrip <= DOCUMENT_REMINDER_DAYS ? 'action' : 'before',
      priority: 'P0', source: 'document', bookingId: booking.id,
    });
  }

  if (daysToTrip <= PACKING_REMINDER_DAYS) {
    for (const item of packing.filter((entry) => entry.critical)) {
      items.push({
        id: `packing:${item.id}`,
        title: item.packed ? `${item.label} packed` : `Pack ${item.label}`,
        detail: 'Critical item for the Europe 18-day trip.',
        when: 'Before departure',
        section: item.packed ? 'ready' : 'action',
        priority: 'P0', source: 'packing', packingId: item.id,
      });
    }
  }

  const order: Record<ReadinessPriority, number> = { P0: 0, P1: 1, Comfort: 2 };
  items.sort((a, b) => order[a.priority] - order[b.priority] || a.when.localeCompare(b.when) || a.title.localeCompare(b.title));
  const sections = {
    action: items.filter((item) => item.section === 'action'),
    before: items.filter((item) => item.section === 'before'),
    waiting: items.filter((item) => item.section === 'waiting'),
    ready: items.filter((item) => item.section === 'ready'),
  };
  return { items, sections, counts: {
    action: sections.action.length, before: sections.before.length,
    waiting: sections.waiting.length, ready: sections.ready.length,
  } };
}

export const actionForDay = (actions: ActionItem[], dayDate: string) =>
  actions.find((item) => !isDone(item.status) && item.due.startsWith(dayDate));
