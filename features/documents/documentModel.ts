export const DOCUMENT_CATEGORIES = [
  'Flight ticket', 'Train ticket', 'Hotel confirmation', 'Attraction ticket',
  'Insurance', 'Visa-related document', 'Reservation', 'eSIM / receipt', 'Other',
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
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

