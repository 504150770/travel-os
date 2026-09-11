import type { EditablePlan } from '@/hooks/use-editable-plan';
import type { Entity, EntityType } from '@/lib/entity-library';
import type { GalleryRequest } from '@/lib/media';

export type DiscoverTab =
  | 'places'
  | 'food'
  | 'gym'
  | 'shopping'
  | 'picks'
  | 'photos';
export type PlanTab =
  | 'bookings'
  | 'transport'
  | 'checkin'
  | 'deadlines'
  | 'tasks'
  | 'budget';
export type MoreTab = 'stay' | 'map' | 'survival' | 'essentials' | 'backup';
export type AddMode = 'place' | 'food' | 'gym' | 'custom';
export type LightboxImage = GalleryRequest | null;
export type CustomEntity = Entity & { type: EntityType };

export type BackupPayload = {
  version: 3 | 4;
  exportedAt: string;
  currentItinerary: EditablePlan;
  customEntities: CustomEntity[];
  bookingStatuses: Record<string, string>;
  actionStatuses?: Record<string, string>;
  taskStatuses?: Record<string, string>;
  actuals: Record<string, number>;
  notes: string;
  favorites: Record<string, boolean>;
  preferredTransport?: Record<string, string>;
  checkinCompleted?: Record<string, boolean>;
  deadlineStatuses?: Record<string, string>;
};

export const cityNames = ['罗马', '佛罗伦萨', '威尼斯', '维也纳', '布拉格', '巴黎'];

export const yuan = (value: number) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(value);

export function mergeBookingActionStatuses(
  storedActionStatuses: Record<string, string>,
  bookingStatuses: Record<string, string>,
) {
  const result = { ...storedActionStatuses };
  const ticketActions: Record<string, string> = {
    vatican: 'ticket-vatican',
    colosseum: 'ticket-colosseum',
    louvre: 'ticket-louvre',
  };
  for (const [id, deadline] of Object.entries(ticketActions)) {
    if (
      ['Booked', 'Paid', 'Confirmed', 'Completed'].includes(
        bookingStatuses[id],
      )
    )
      result[`deadline:${deadline}`] = 'Done';
  }
  return result;
}
