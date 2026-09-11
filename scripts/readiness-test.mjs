import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IDBFactory } from 'fake-indexeddb';
import { saveDocument, readDocument, listDocuments, deleteDocument } from '../features/documents/documentStore.ts';
import { DEFAULT_PACKING_ITEMS, packingSummary, updatePackingItem } from '../features/packing/packingModel.ts';
import { buildReadiness } from '../features/readiness/readinessModel.ts';
import { runPrivacyAudit } from './privacy-audit.mjs';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const factory = new IDBFactory();
const pdf = new Blob(['%PDF-1.4 local offline test'], { type: 'application/pdf' });
await saveDocument({ id: 'doc-test', title: 'Hotel confirmation', category: 'Hotel confirmation', city: '维也纳', dayId: 9, bookingId: 'booking-stay-vienna', fileName: 'confirmation.pdf', mimeType: pdf.type, size: pdf.size, addedAt: '2026-09-11T00:00:00.000Z', blob: pdf }, factory);
assert.equal((await listDocuments(factory)).length, 1);
assert.equal((await readDocument('doc-test', factory))?.blob.size, pdf.size, 'document blob must remain readable without a network');
assert.equal((await readDocument('doc-test', factory))?.bookingId, 'booking-stay-vienna');
await deleteDocument('doc-test', factory);
assert.equal((await listDocuments(factory)).length, 0);

assert.equal(DEFAULT_PACKING_ITEMS.length, 48);
assert.equal(packingSummary(DEFAULT_PACKING_ITEMS).criticalRemaining, 5);
const packedPassport = updatePackingItem(DEFAULT_PACKING_ITEMS, 'pack-01', { packed: true });
assert.equal(packingSummary(packedPassport).packed, 1);
assert.equal(packingSummary(packedPassport).criticalRemaining, 4);

const actions = [
  { id: 'deadline:visa', source: 'deadline', sourceId: 'visa', title: 'Visa', detail: 'Submit', due: '2026-09-12 23:59', priority: 'Critical', status: 'Open', target: 'deadlines' },
  { id: 'task:later', source: 'task', sourceId: 'later', title: 'Final weather', detail: 'Check later', due: '2026-11-28', priority: 'Nice', status: 'Open', target: 'tasks' },
  { id: 'checkin:hotel', source: 'checkin', sourceId: 'hotel', title: 'Hotel check-in', detail: 'Wait for email', due: '2026-12-08', priority: 'Critical', status: 'Waiting', target: 'checkin', hotelId: 'hotel' },
  { id: 'task:done', source: 'task', sourceId: 'done', title: 'Hotels held', detail: 'Done', due: '2026-09-08', priority: 'Nice', status: 'Done', target: 'tasks' },
];
const far = buildReadiness({ now: new Date('2026-09-11T12:00:00'), tripStart: '2026-12-01', actions, bookings: [], packing: DEFAULT_PACKING_ITEMS, documents: [], privateLinks: {} });
assert.equal(far.sections.action.some((item) => item.id.includes('visa')), true);
assert.equal(far.sections.before.some((item) => item.id.includes('later')), true);
assert.equal(far.sections.waiting.some((item) => item.id.includes('checkin')), true);
assert.equal(far.sections.ready.some((item) => item.id.includes('done')), true);
assert.equal(far.items.some((item) => item.source === 'packing'), false, 'packing must stay quiet months before departure');
const linkAvailable = buildReadiness({ now: new Date('2026-09-11T12:00:00'), tripStart: '2026-12-01', actions, bookings: [], packing: DEFAULT_PACKING_ITEMS, documents: [], privateLinks: { hotel: 'https://example.invalid/private' } });
assert.equal(linkAvailable.sections.before.some((item) => item.id.includes('checkin')), true, 'private link availability must update readiness automatically');
const near = buildReadiness({ now: new Date('2026-11-20T12:00:00'), tripStart: '2026-12-01', actions: [], bookings: [], packing: DEFAULT_PACKING_ITEMS, documents: [], privateLinks: {} });
assert.equal(near.sections.action.filter((item) => item.source === 'packing').length, 5);

const bookedTrain = { id: 'train-1', category: '铁路', title: 'Rome to Florence', date: '2026-12-05', budget: 1, status: 'Booked', detail: '', paymentStatus: 'Paid', supplier: '', orderNumber: '', cancellationDeadline: '', address: '', serviceNumber: '', stationAirport: '', baggage: '', contact: '', notes: '', attachmentName: '', lastVerified: '' };
const missing = buildReadiness({ now: new Date('2026-11-20T12:00:00'), tripStart: '2026-12-01', actions: [], bookings: [bookedTrain], packing: [], documents: [], privateLinks: {} });
assert.equal(missing.sections.action[0]?.source, 'document');
const saved = buildReadiness({ now: new Date('2026-11-20T12:00:00'), tripStart: '2026-12-01', actions: [], bookings: [bookedTrain], packing: [], documents: [{ id: 'd', title: 'Ticket', category: 'Train ticket', bookingId: 'train-1', fileName: 't.pdf', mimeType: 'application/pdf', size: 2, addedAt: '' }], privateLinks: {} });
assert.equal(saved.sections.ready[0]?.source, 'document');

assert.deepEqual(runPrivacyAudit(), []);
const controller = readFileSync(join(root, 'features/app/useAppController.ts'), 'utf8');
assert.doesNotMatch(controller.match(/const backup: BackupPayload = \{([\s\S]*?)\n  \};/)?.[1] ?? '', /privateLinks|documents|location/i);
console.log('Readiness tests passed: IndexedDB offline blobs, packing persistence/critical window, time-aware sections, private-link updates, document requirements and privacy exclusions.');

