import assert from 'node:assert/strict';
import fs from 'node:fs';
import { deriveCurrentDayState, deriveGymFit } from '../lib/derive-current-day.ts';
import { buildActionQueue, checkinActionId, taskActionId } from '../lib/action-queue.ts';
import { calculateBudget } from '../lib/budget-calculator.ts';
import { canonicalBookings } from '../lib/hotel-execution.ts';
import { safePrivateLink } from '../lib/private-links.ts';

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const days = read('days');
const plans = read('day-plans');
const routes = read('day-routes');
const hotels = read('hotel-bookings').items;
const bookingsData = read('bookings');
const outboundFlight = bookingsData.items.find((item) => item.id === 'flight-can-fco');
const returnFlight = bookingsData.items.find((item) => item.id === 'flight-cdg-can');
assert.equal(outboundFlight.status, 'Ticketed');
assert.equal(outboundFlight.serviceNumber, 'GF123 / GF027');
assert.equal(returnFlight.status, 'Ticketed');
assert.equal(returnFlight.serviceNumber, 'CZ348');
assert.equal(outboundFlight.orderNumber, '');
assert.equal(returnFlight.orderNumber, '');

const entity = (id) => ({
  id, name: id, city: '罗马', type: id.startsWith('activity-') ? 'activity' : 'place',
  projectedCostCny: null, images: [], raw: {}, address: '', mapQuery: id, coordinates: null,
  description: '', priceLabel: '', openingHours: '', links: {}, source: '', lastVerified: '', tags: [], notes: '',
});

const day3Plan = structuredClone(plans.days[2]);
const resolve = (id) => entity(id);
const original = deriveCurrentDayState({ day: days[2], planDay: day3Plan, staticRoute: routes[2], hotel: hotels[0], resolve });
assert.deepEqual(original.route.legs.map((leg) => leg.toId), ['colosseum', 'forum', 'pantheon', hotels[0].id]);
assert.equal(original.route.legs.every((leg) => leg.status === 'ROUTED'), true);

[day3Plan.activeItems[0], day3Plan.activeItems[1]] = [day3Plan.activeItems[1], day3Plan.activeItems[0]];
const changed = deriveCurrentDayState({ day: days[2], planDay: day3Plan, staticRoute: routes[2], hotel: hotels[0], resolve });
assert.deepEqual(changed.route.legs.slice(0, 2).map((leg) => leg.toId), ['forum', 'colosseum']);
assert.equal(changed.route.legs.some((leg) => leg.status === 'PENDING'), true);
assert.notEqual(changed.route.summary.status, original.route.summary.status);
assert.equal(deriveGymFit(days[2], changed).level, 'good');

assert.equal(bookingsData.items.some((item) => item.category === '酒店'), false);
const canonical = canonicalBookings(hotels, bookingsData.items);
assert.equal(canonical.filter((item) => item.category === '酒店').length, 6);
assert.equal(canonical.find((item) => item.id === `booking-${hotels[0].id}`).budget, hotels[0].execution.committedCnyApprox);

const budget = read('budget');
const baseBudget = calculateBudget({ budget, bookings: canonical, plan: plans, resolve });
assert.equal(baseBudget.committed, 16286.52, 'ticketed flight allocations join committed hotel costs');
const withoutArc = structuredClone(plans);
const arcDay = withoutArc.days.find((day) => day.activeItems.some((item) => item.entityId === 'arc_triomphe'));
const arc = arcDay.activeItems.find((item) => item.entityId === 'arc_triomphe');
arcDay.activeItems = arcDay.activeItems.filter((item) => item !== arc);
arcDay.alternatives.push(arc);
const changedBudget = calculateBudget({ budget, bookings: canonical, plan: withoutArc, resolve });
assert.equal(baseBudget.projected - changedBudget.projected, 145);
assert.equal(changedBudget.optional, 0);

const queue = buildActionQueue({ deadlines: read('deadlines'), tasks: read('tasks').items, stays: hotels, statuses: { [checkinActionId('stay-vienna-jimmys')]: 'Done' }, bookingStatuses: {} });
assert.equal(queue.filter((item) => item.id === checkinActionId('stay-vienna-jimmys')).length, 1);
assert.equal(queue.find((item) => item.id === checkinActionId('stay-vienna-jimmys')).status, 'Done');
assert.equal(queue.find((item) => !['Done', 'Skipped'].includes(item.status)).title, '锁定意大利申根递签时间');
assert.equal(queue.find((item) => item.id === taskActionId('visa-appointment')).status, 'Open');

assert.equal(safePrivateLink('https://example.com/check-in?token=private')?.startsWith('https://'), true);
assert.equal(safePrivateLink('javascript:alert(1)'), undefined);
assert.equal(safePrivateLink('http://example.com'), undefined);

const manifest = JSON.parse(fs.readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
assert.equal(manifest.display, 'standalone');
assert.equal(fs.existsSync(new URL('../public/sw.js', import.meta.url)), true);

console.log('Linkage tests passed: Current Plan → route/gym/budget, action/check-in sync, hotel source, private links, PWA.');
