import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bookingsForDate, mobileTransportBookingIds, transportPreferenceAllowed, transportSegmentsForDay } from '../components/mobile/mobileTransportModel.ts';

const segments = JSON.parse(fs.readFileSync(new URL('../data/transport-recommendations.json', import.meta.url), 'utf8')).segments;
const bookings = JSON.parse(fs.readFileSync(new URL('../data/bookings.json', import.meta.url), 'utf8')).items;
const original = JSON.stringify(segments);

// A locked segment stays read-only even if future data contains an unticketed
// candidate. Unticketed segments still allow the existing preference choice.
assert.equal(transportPreferenceAllowed('TICKETED', 'TICKETED'), false);
assert.equal(transportPreferenceAllowed('TICKETED', 'EXACT TRAIN UNVERIFIED'), false);
assert.equal(transportPreferenceAllowed('TARGET-DATE FARE PENDING', 'TICKETED'), false);
assert.equal(transportPreferenceAllowed('TARGET-DATE FARE PENDING', 'EXACT TRAIN UNVERIFIED'), true);
for (const segment of segments) {
  for (const candidate of segment.candidates) {
    if (segment.status === 'TICKETED') assert.equal(transportPreferenceAllowed(segment.status, candidate.status), false);
    else assert.equal(transportPreferenceAllowed(segment.status, candidate.status), true);
  }
}

// Overnight ticketed flights remain reachable from their arrival day, while a
// candidate arrival date never turns a not-yet-ticketed trip into today's leg.
assert.deepEqual(transportSegmentsForDay(segments, 2, '2026-12-02').current.map((item) => item.id), ['can-fco']);
assert.deepEqual(transportSegmentsForDay(segments, 18, '2026-12-18').current.map((item) => item.id), ['paris-can']);
assert.deepEqual(transportSegmentsForDay(segments, 5, '2026-12-05').current.map((item) => item.id), ['rome-florence']);
assert.equal(transportSegmentsForDay(segments, 6, '2026-12-06').current.length, 0);
const unconfirmedArrival = [{ ...segments[1], candidates: [{ ...segments[1].candidates[0], arrivalDate: '2026-12-06' }] }];
assert.equal(transportSegmentsForDay(unconfirmedArrival, 6, '2026-12-06').current.length, 0);

for (let day = 1; day <= 18; day += 1) {
  const grouped = transportSegmentsForDay(segments, day, `2026-12-${String(day).padStart(2, '0')}`);
  const ids = [...grouped.current, ...grouped.other].map((item) => item.id);
  assert.equal(ids.length, segments.length);
  assert.equal(new Set(ids).size, segments.length, 'A segment belongs to exactly one date group.');
}
for (const segment of segments) {
  const booking = bookings.find((item) => item.id === mobileTransportBookingIds[segment.id]);
  assert.ok(booking, `Missing existing booking for ${segment.id}`);
  assert.ok(booking.date.startsWith(segment.date), `${segment.id} must link to its departure-date booking`);
}
assert.equal(JSON.stringify(segments), original, 'Presentation grouping must not mutate transport facts.');
assert.equal(mobileTransportBookingIds['unknown-segment'], undefined);

const dayTwoBookings = bookingsForDate(bookings, '2026-12-02', []);
assert.ok(dayTwoBookings.current.some((booking) => booking.id === 'flight-can-fco'));
assert.ok(dayTwoBookings.other.some((booking) => booking.id === 'flight-cdg-can'));
assert.ok(bookingsForDate(bookings, '2026-12-18', [], segments).current.some((booking) => booking.id === 'flight-cdg-can'));
const hotelBookings = [{ id: 'booking-stay-a', date: '2026-12-02' }, { id: 'booking-stay-b', date: '2026-12-05' }, { id: 'pending', date: '出发前7天' }];
const stays = [{ id: 'stay-a', checkIn: '2026-12-02', checkOut: '2026-12-05' }, { id: 'stay-b', checkIn: '2026-12-05', checkOut: '2026-12-07' }];
assert.deepEqual(bookingsForDate(hotelBookings, '2026-12-04', stays).current.map((item) => item.id), ['booking-stay-a']);
assert.deepEqual(bookingsForDate(hotelBookings, '2026-12-05', stays).current.map((item) => item.id), ['booking-stay-a', 'booking-stay-b']);
assert.equal(bookingsForDate(hotelBookings, '2026-12-08', stays).current.length, 0);
assert.ok(bookingsForDate(hotelBookings, '2026-12-05', stays).other.some((item) => item.id === 'pending'), 'Unresolved dates remain available without guessing a travel day.');
console.log('Mobile plan tests passed: day-related bookings, overnight arrivals, existing booking links and unchanged transport facts.');
