import assert from 'node:assert/strict';
import fs from 'node:fs';
import { deriveCurrentDayState, deriveGymFit } from '../lib/derive-current-day.ts';
import { buildActionQueue, checkinActionId, taskActionId } from '../lib/action-queue.ts';
import { calculateBudget } from '../lib/budget-calculator.ts';
import { canonicalBookings } from '../lib/hotel-execution.ts';
import { safePrivateLink } from '../lib/private-links.ts';
import { migrateEditablePlan } from '../features/trip/planModel.ts';

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const days = read('days');
const plans = read('day-plans');
const routes = read('day-routes');
const spatialEntities = [...read('places'), ...read('options')];
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

const spatialEntity = (id, coordinates = null) => ({
  id, name: id, city: '罗马', type: id.startsWith('activity-') ? 'activity' : 'place',
  projectedCostCny: null, images: [], raw: {}, address: '', mapQuery: id, coordinates,
  description: '', priceLabel: '', openingHours: '', links: {}, source: '', lastVerified: '', tags: [], notes: '',
});

const expectedCurrentPlans = {
  8: [
    ['09:30', 'opt-venice-rialto', '40min'],
    ['10:10', 'activity-d8-walk-stmarks', '20min'],
    ['10:30', 'st_mark_square', '40min'],
    ['11:10', 'bridge_sighs', '20min'],
    ['11:30', 'activity-d8-03', '75min'],
    ['12:45', 'activity-d8-coffee-rest', '30min'],
    ['13:15', 'activity-d8-basilica-buffer', '45min'],
    ['14:00', 'st_mark_basilica', '75min'],
  ],
  10: [
    ['10:00', 'schonbrunn', '120min'],
    ['12:00', 'activity-d10-transfer-stephansplatz', '35min'],
    ['12:35', 'activity-d10-02', '60min'],
    ['13:35', 'opt-vienna-stephansdom', '30min'],
    ['14:05', 'activity-d10-old-town-walk', '40min'],
    ['14:45', 'activity-d10-coffee-rest', '30min'],
    ['15:15', 'activity-d10-buffer', '15min'],
    ['15:30', 'activity-d10-transfer-rathausplatz', '30min'],
    ['16:00', 'rathausplatz', '120min'],
  ],
  14: [
    ['09:30', 'louvre', '150min'],
    ['12:00', 'activity-d14-02', '90min'],
    ['13:30', 'louvre_pyramid', '30min'],
    ['14:00', 'activity-d14-flexible-paris', '150min'],
  ],
  15: [
    ['09:30', 'trocadero', '40min'],
    ['10:10', 'activity-d15-walk-eiffel', '20min'],
    ['10:30', 'eiffel', '60min'],
    ['11:30', 'activity-d15-transfer-lunch', '30min'],
    ['12:00', 'activity-d15-02', '150min'],
    ['14:30', 'activity-d15-transfer-arc', '30min'],
    ['15:00', 'activity-d15-arc-buffer', '30min'],
    ['15:30', 'arc_triomphe', '105min'],
  ],
};
for (const [dayId, expected] of Object.entries(expectedCurrentPlans)) {
  const planDay = plans.days.find((day) => day.dayId === Number(dayId));
  assert.deepEqual(
    planDay.activeItems.map(({ time, entityId, duration }) => [time, entityId, duration]),
    expected,
  );
}
assert.equal(plans.days[7].alternatives.some((item) => item.entityId === 'opt-venice-rialto'), false);
assert.equal(plans.days[9].alternatives.some((item) => item.entityId === 'opt-vienna-stephansdom'), false);

const expectedMapStops = {
  8: [['opt-venice-rialto', 1], ['st_mark_square', 2], ['bridge_sighs', 3], ['st_mark_basilica', 4]],
  10: [['schonbrunn', 1], ['opt-vienna-stephansdom', 2], ['rathausplatz', 3]],
  15: [['trocadero', 1], ['eiffel', 2], ['arc_triomphe', 3]],
};
for (const [dayId, expected] of Object.entries(expectedMapStops)) {
  const dayNumber = Number(dayId);
  const planDay = plans.days.find((day) => day.dayId === dayNumber);
  const route = routes.find((item) => item.day === dayNumber);
  const stay = hotels.find((item) => item.id === route.hotelId);
  let stopOrder = 0;
  const points = planDay.activeItems.flatMap((item) => {
    const row = spatialEntities.find((entity) => entity.id === item.entityId);
    if (typeof row?.lat !== 'number' || typeof row?.lng !== 'number') return [];
    stopOrder += 1;
    return [{ id: row.id, order: stopOrder }];
  });
  assert.deepEqual(
    points.map(({ id, order }) => [id, order]),
    expected,
  );
  const derived = deriveCurrentDayState({
    day: days.find((item) => item.day === dayNumber),
    planDay,
    staticRoute: route,
    hotel: stay,
    resolve: (id) => {
      const row = spatialEntities.find((entity) => entity.id === id);
      return row
        ? spatialEntity(id, { lat: row.lat, lng: row.lng })
        : spatialEntity(id);
    },
  });
  assert.equal(derived.route.legs.every((leg) => leg.status === 'ROUTED'), true);
}

const previousPlan = structuredClone(plans);
previousPlan.version = 1;
previousPlan.originalPlanId = 'winter-europe-2026-v1';
previousPlan.days.find((day) => day.dayId === 8).activeItems.push({
  id: 'user-custom-d8', entityId: 'custom-stop', order: 99, time: '17:00',
  duration: '30min', status: 'planned', notes: '', guard: '', ticket: '无票',
});
const migratedPlan = migrateEditablePlan(previousPlan, plans);
assert.equal(migratedPlan.originalPlanId, 'winter-europe-2026-v2');
assert.equal(migratedPlan.days.find((day) => day.dayId === 8).activeItems.at(-1).id, 'user-custom-d8');
assert.deepEqual(migratedPlan.days.find((day) => day.dayId === 6), previousPlan.days.find((day) => day.dayId === 6));

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
