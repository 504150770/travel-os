import type { Booking } from '@/lib/types';

export const DOCUMENT_CATEGORIES = [
  'Flight ticket', 'Train ticket', 'Hotel confirmation', 'Attraction ticket',
  'Insurance', 'Visa-related document', 'Reservation', 'eSIM / receipt', 'Other',
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export type DocumentOpenRequest = { bookingId: string; token: number };

export function documentDraftForBooking(booking: Pick<Booking, 'id' | 'title' | 'category'>) {
  const category: DocumentCategory = booking.id.startsWith('booking-stay-') || /酒店/.test(booking.category)
    ? 'Hotel confirmation'
    : /铁路/.test(booking.category) ? 'Train ticket'
      : /机票|航班/.test(booking.category) ? 'Flight ticket'
        : /景点票/.test(booking.category) ? 'Attraction ticket'
          : /保险/.test(booking.category) ? 'Insurance' : 'Other';
  return { bookingId: booking.id, title: booking.title, category };
}
export type DocumentMetadata = {
  id: string;
  title: string;
  category: DocumentCategory;
  city?: string;
  dayId?: number;
  bookingId?: string;
  fileName: string;
  mimeType: string;
  size: number;
  addedAt: string;
  note?: string;
};
export type StoredDocument = DocumentMetadata & { blob: Blob };

export const ACCEPTED_DOCUMENT_TYPES = [
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
] as const;
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export function validateDocumentFile(file: Pick<File, 'type' | 'size'>) {
  if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type as (typeof ACCEPTED_DOCUMENT_TYPES)[number]))
    return 'Only PDF, JPG, PNG and WEBP files are supported.';
  if (file.size > MAX_DOCUMENT_BYTES) return 'Keep each document under 25 MB.';
  if (file.size === 0) return 'This file is empty.';
  return null;
}

export const formatDocumentSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

