import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const data = {
  trip: readJson('data/trip.json'), days: readJson('data/days.json'), places: readJson('data/places.json'),
  options: readJson('data/options.json'), images: readJson('data/images.json'), gyms: readJson('data/gyms.json'),
  bookings: readJson('data/bookings.json'), tasks: readJson('data/tasks.json'), restaurants: readJson('data/restaurants.json'), xhs: readJson('data/xhs.json'), budget: readJson('data/budget.json'), checklist: readJson('data/checklist.json'),
  essentials: readJson('data/essentials.json'), conflicts: readJson('data/conflicts.json'),
  activities: readJson('data/activities.json'), dayPlans: readJson('data/day-plans.json'), quickPicks: readJson('data/quick-picks.json'),
  hotelBookings: readJson('data/hotel-bookings.json'), transportRecommendations: readJson('data/transport-recommendations.json'),
  shopping: readJson('data/shopping.json'),
  dayRoutes: readJson('data/day-routes.json'), transitDayExecution: readJson('data/transit-day-execution.json'),
  deadlines: readJson('data/deadlines.json'), survival: readJson('data/survival.json'),
};
const schema = readJson('schemas/guide.schema.json');
const failures = [];
const warnings = [];
const checks = {};

function fail(dimension, message) { failures.push({ dimension, message }); }
function warn(dimension, message) { warnings.push({ dimension, message }); }
function validate(value, node, trail = '$') {
  if (!node) return;
  if (node.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('schema', `${trail} must be object`);
    for (const key of node.required ?? []) if (!(key in value) || value[key] === '' || value[key] === undefined) fail('schema', `${trail}.${key} missing`);
    for (const [key, child] of Object.entries(node.properties ?? {})) if (key in value) validate(value[key], child, `${trail}.${key}`);
  }
  if (node.type === 'array') {
    if (!Array.isArray(value)) return fail('schema', `${trail} must be array`);
    if (node.minItems !== undefined && value.length < node.minItems) fail('schema', `${trail} has ${value.length}, needs >= ${node.minItems}`);
    if (node.maxItems !== undefined && value.length > node.maxItems) fail('schema', `${trail} has ${value.length}, needs <= ${node.maxItems}`);
    value.forEach((item, index) => validate(item, node.items, `${trail}[${index}]`));
  }
}

validate(data, schema);
checks.schemaValidation = failures.filter((item) => item.dimension === 'schema').length === 0;

const ids = (list) => list.map((item) => item.id);
function unique(list, label) { const dup = list.filter((value, index) => list.indexOf(value) !== index); if (dup.length) fail('structure', `${label} duplicates: ${[...new Set(dup)].join(', ')}`); }
unique(data.days.map((day) => day.day), 'day numbers');
unique(ids(data.places), 'place ids');
unique(ids(data.options), 'option ids');
unique(ids(data.images), 'image ids');
unique(ids(data.gyms), 'gym ids');
unique(ids(data.bookings.items), 'booking ids');
unique(ids(data.tasks.items), 'task ids');
unique(ids(data.restaurants), 'restaurant ids');
unique(ids(data.xhs), 'xhs ids');
unique(ids(data.activities), 'activity ids');

unique(ids(data.shopping), 'shopping ids');
const entityIds = new Set([...ids(data.places), ...ids(data.options), ...ids(data.restaurants), ...ids(data.gyms), ...ids(data.shopping), ...ids(data.activities)]);
if (data.dayPlans.days.length !== 18) fail('editable_plan', 'Editable plan must contain 18 days');
for (const day of data.dayPlans.days) {
  if (day.dayId < 1 || day.dayId > 18) fail('editable_plan', `Invalid plan day ${day.dayId}`);
  for (const zone of ['activeItems','alternatives']) {
    const refs = day[zone].map((item) => item.entityId);
    if (new Set(refs).size !== refs.length) fail('editable_plan', `Day ${day.dayId} ${zone} has duplicate Entity refs`);
    for (const item of day[zone]) {
      if (!entityIds.has(item.entityId)) fail('editable_plan', `Day ${day.dayId} references missing Entity ${item.entityId}`);
      if ('name' in item || 'city' in item || 'images' in item) fail('editable_plan', `Day ${day.dayId} duplicates Entity data in ${item.id}`);
    }
  }
}
for (const city of data.quickPicks.cities) for (const pick of city.items) if (!entityIds.has(pick.entityId)) fail('editable_plan', `${city.city} pick references missing Entity ${pick.entityId}`);
checks.editableEntityPlan = failures.filter((item) => item.dimension === 'editable_plan').length === 0;

const dates = data.days.map((day) => new Date(`${day.date}T00:00:00Z`).getTime());
if (!data.days.every((day, index) => day.day === index + 1)) fail('structure', 'Day numbers are not exactly 1–18');
if (!dates.slice(1).every((date, index) => date - dates[index] === 86400000)) fail('structure', 'Day dates are not contiguous');
if (data.trip.cities.reduce((sum, city) => sum + city.nights, 0) !== 15) fail('structure', 'City nights do not sum to 15');
if (data.trip.hotelChanges !== data.trip.cities.length - 1) fail('structure', 'Hotel changes must equal cities minus one');
checks.tripStructure = failures.filter((item) => item.dimension === 'structure').length === 0;

const placeIds = new Set(ids(data.places));
const gymIds = new Set(ids(data.gyms));
for (const day of data.days) {
  if (!day.timeline.length) fail('references', `Day ${day.day} has no timeline`);
  if (!day.lossCut) fail('references', `Day ${day.day} has no stop-loss`);
  for (const stop of day.timeline) if (stop.placeId && !placeIds.has(stop.placeId)) fail('references', `Day ${day.day} missing place ${stop.placeId}`);
  for (const gymId of day.gymIds) if (!gymIds.has(gymId)) fail('references', `Day ${day.day} missing gym ${gymId}`);
}
checks.referenceIntegrity = failures.filter((item) => item.dimension === 'references').length === 0;

const imagesByPlace = new Map();
for (const image of data.images) if (image.placeId) imagesByPlace.set(image.placeId, [...(imagesByPlace.get(image.placeId) ?? []), image]);
for (const day of data.days) for (const stop of day.timeline) {
  if (stop.placeId && !imagesByPlace.get(stop.placeId)?.length) fail('trip_media', `Day ${day.day} stop ${stop.placeId} has no image`);
}
checks.tripStopImageCoverage = failures.filter((item) => item.dimension === 'trip_media').length === 0;

for (const city of data.trip.cities.map((item) => item.name)) {
  const choices = data.options.filter((item) => item.city === city);
  if (choices.length !== 4) fail('options', `${city} has ${choices.length} optional place choices`);
}
for (const option of data.options) {
  if (!option.recommendedDays.every((day) => day >= 1 && day <= 18)) fail('options', `${option.id} has invalid recommended day`);
  if (!option.source.startsWith('https://')) fail('options', `${option.id} missing source URL`);
}
checks.optionAudit = failures.filter((item) => item.dimension === 'options').length === 0;

const requestedAssets = [
  data.trip.coverImage,
  ...data.images.map((item) => item.file),
  ...data.gyms.map((item) => item.image),
  ...data.restaurants.flatMap((item) => [item.dishImage, item.restaurantImage, item.environmentImage]).filter(Boolean),
  ...data.shopping.map((item) => item.image).filter(Boolean),
];
unique(requestedAssets, 'asset paths');
const hashes = new Map();
const perceptual = [];
for (const asset of requestedAssets) {
  const local = path.join(root, 'public', asset.replace(/^\//, ''));
  if (!fs.existsSync(local)) { fail('media', `missing ${asset}`); continue; }
  const bytes = fs.readFileSync(local);
  const header = bytes.subarray(0, 12).toString('ascii');
  if (!header.startsWith('RIFF') || !header.includes('WEBP')) fail('media', `broken or non-WebP asset ${asset}`);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  if (hashes.has(hash)) fail('media', `duplicate image bytes: ${asset} and ${hashes.get(hash)}`);
  hashes.set(hash, asset);
  const pixels = await sharp(local).resize(9, 8, { fit: 'fill' }).greyscale().raw().toBuffer();
  let bits = '';
  for (let row = 0; row < 8; row += 1) for (let col = 0; col < 8; col += 1) bits += pixels[row * 9 + col] > pixels[row * 9 + col + 1] ? '1' : '0';
  perceptual.push({ asset, bits });
}
const hamming = (a, b) => [...a].reduce((sum, bit, index) => sum + Number(bit !== b[index]), 0);
for (let i = 0; i < perceptual.length; i += 1) for (let j = i + 1; j < perceptual.length; j += 1) {
  const distance = hamming(perceptual[i].bits, perceptual[j].bits);
  if (distance <= 2) fail('near_duplicate', `${perceptual[i].asset} and ${perceptual[j].asset} are visually near-identical (dHash ${distance})`);
}
if (!data.images.every((image) => image.visuallyReviewed === true)) fail('media', 'Visual image lacks review flag');
checks.imageDeduplication = failures.filter((item) => item.dimension === 'media' && item.message.includes('duplicate')).length === 0;
checks.brokenImageDetection = failures.filter((item) => item.dimension === 'media' && !item.message.includes('duplicate')).length === 0;
checks.visualNearDuplicateDetection = failures.filter((item) => item.dimension === 'near_duplicate').length === 0;

const cityNames = data.trip.cities.map((city) => city.name);
const realStays = data.hotelBookings.items;
unique(ids(realStays), 'real hotel booking ids');
if (realStays.length !== 6) fail('real_hotels', `expected 6 real hotel bookings, found ${realStays.length}`);
if (realStays.reduce((sum, stay) => sum + stay.nights, 0) !== 15) fail('real_hotels', 'real hotel nights do not sum to 15');
for (const city of cityNames) if (realStays.filter((stay) => stay.city === city).length !== 1) fail('real_hotels', `${city} must have one real hotel booking`);
for (const stay of realStays) {
  if (!stay.sourceFile || !stay.sourcePath || !stay.bookingNumber) fail('real_hotels', `${stay.hotelName} missing voucher provenance`);
  if (!(stay.checkIn < stay.checkOut)) fail('real_hotels', `${stay.hotelName} has invalid stay dates`);
  if (!stay.roomType || stay.privateBathroom !== true) fail('real_hotels', `${stay.hotelName} missing confirmed room/private bathroom`);
}
const paidOnline = Number(realStays.reduce((sum, stay) => sum + stay.paidOnlineCny, 0).toFixed(2));
const committed = Number(realStays.reduce((sum, stay) => sum + stay.committedCnyApprox, 0).toFixed(2));
if (paidOnline !== data.hotelBookings.summary.paidOnlineCny) fail('real_hotels', 'paid hotel total differs from source summary');
if (committed !== data.hotelBookings.summary.committedCnyApprox) fail('real_hotels', 'committed hotel total differs from source summary');
checks.realHotelVoucherAudit = failures.filter((item) => item.dimension === 'real_hotels').length === 0;
for (const stay of realStays) {
  if (!Number.isFinite(stay.coordinates?.lat) || !Number.isFinite(stay.coordinates?.lng)) fail('hotel_execution', `${stay.hotelName} missing exact geocoded coordinates`);
  for (const field of ['frontDeskType','onlineCheckIn','luggage','requests','cancellation','images']) if (!stay[field]) fail('hotel_execution', `${stay.hotelName} missing ${field}`);
}
const florenceStay = realStays.find((stay) => stay.id === 'stay-florence-fonderia');
const veniceStay = realStays.find((stay) => stay.id === 'stay-venice-ai-pini');
const viennaStay = realStays.find((stay) => stay.id === 'stay-vienna-jimmys');
const pragueStay = realStays.find((stay) => stay.id === 'stay-prague-ostas');
if (florenceStay?.breakfastTime !== '08:00–09:30' || florenceStay?.onlineCheckIn.requirement !== 'Recommended') fail('hotel_execution', 'La Fonderia execution facts drifted');
if (veniceStay?.luggage.early !== 'Confirmed' || Object.values(veniceStay?.requests ?? {}).some((value) => value !== 'Requested')) fail('hotel_execution', 'Ai Pini luggage/request facts drifted');
if (viennaStay?.onlineCheckIn.requirement !== 'Required' || viennaStay?.luggage.early !== 'Confirmed') fail('hotel_execution', "Jimmy's check-in/luggage facts drifted");
if (pragueStay?.onlineCheckIn.requirement !== 'Required' || pragueStay?.onlineCheckIn.status !== 'Waiting') fail('hotel_execution', 'Ostaš check-in facts drifted');
checks.hotelExecutionAudit = failures.filter((item) => item.dimension === 'hotel_execution').length === 0;

const hotelIds = new Set(ids(realStays));
if (data.dayRoutes.length !== 18 || !data.dayRoutes.every((route, index) => route.day === index + 1)) fail('day_routes', 'day route dataset must contain ordered Day 1–18');
for (const route of data.dayRoutes) {
  if (route.hotelId && !hotelIds.has(route.hotelId)) fail('day_routes', `Day ${route.day} references missing hotel ${route.hotelId}`);
  for (const leg of route.legs) {
    if (!leg.from || !leg.to || !leg.recommendedMode || !leg.recommended) fail('day_routes', `${leg.id} missing route execution fields`);
    if (leg.status !== 'ROUTED') fail('day_routes', `${leg.id} is not routed`);
  }
  if (!route.atGlance?.lateRule || !route.atGlance?.backHotel) fail('day_routes', `Day ${route.day} missing at-a-glance execution fields`);
}
checks.dayRouteAudit = failures.filter((item) => item.dimension === 'day_routes').length === 0;

const transitDays = [5,7,9,11,13,17];
if (data.transitDayExecution.length !== 6 || transitDays.some((day) => !data.transitDayExecution.some((item) => item.day === day))) fail('transit_execution', 'transit execution cards must cover D5/D7/D9/D11/D13/D17');
const segmentIds = new Set(data.transportRecommendations.segments.map((item) => item.id));
for (const item of data.transitDayExecution) if (!segmentIds.has(item.segmentId) || !item.delay30 || !item.delay60 || !item.delay90) fail('transit_execution', `Day ${item.day} execution card is incomplete`);
checks.transitExecutionAudit = failures.filter((item) => item.dimension === 'transit_execution').length === 0;

unique(ids(data.deadlines), 'deadline ids');
for (const item of data.deadlines) if (!item.date || !item.action || !['Critical','Nice'].includes(item.priority)) fail('deadlines', `${item.id} missing deadline execution fields`);
checks.deadlineAudit = failures.filter((item) => item.dimension === 'deadlines').length === 0;
if (data.survival.length !== 6) fail('survival', 'survival dataset must contain six cities');
for (const item of data.survival) if (!hotelIds.has(item.hotelId) || item.emergency !== '112') fail('survival', `${item.city} survival card is not anchored to its booked hotel`);
checks.survivalAudit = failures.filter((item) => item.dimension === 'survival').length === 0;


if (data.transportRecommendations.segments.length !== 7) fail('transport', 'transport structure must contain 7 trip segments');
for (const segment of data.transportRecommendations.segments) {
  if (segment.candidates.length !== 3) fail('transport', `${segment.route} must contain 3 ranked slots`);
  if (!segment.source.startsWith('https://')) fail('transport', `${segment.route} missing official source`);
  if (!segment.doorToDoor) fail('transport', `${segment.route} missing door-to-door estimate`);
}
checks.transportStructureAudit = failures.filter((item) => item.dimension === 'transport').length === 0;

if (data.gyms.length < 8 || data.gyms.length > 10) fail('gyms', 'gym count must be 8–10');
if (data.gyms.filter((gym) => gym.photogenicRank).length !== 5) fail('gyms', 'Most Photogenic list must contain exactly 5 gyms');
for (const gym of data.gyms) {
  if (!gym.dayPass) fail('gyms', `${gym.name} missing day pass state`);
  if (!gym.source || !/^https?:\/\//.test(gym.source)) fail('gyms', `${gym.name} missing Day Pass source`);
  if (!realStays.some((stay) => stay.id === gym.hotelId)) fail('hotel_anchor', `${gym.name} does not reference a confirmed hotel`);
}
checks.gymAudit = failures.filter((item) => item.dimension === 'gyms').length === 0;

for (const restaurant of data.restaurants) {
  if (!restaurant.source || !/^https?:\/\//.test(restaurant.source)) fail('food', `${restaurant.name} missing source`);
  if (!restaurant.hours) fail('food', `${restaurant.name} missing operating-status field`);
  if (!restaurant.recommendedDays?.length) fail('food', `${restaurant.name} missing route-day match`);
  if (!restaurant.menu?.status) fail('food', `${restaurant.name} missing explicit menu verification state`);
  if (restaurant.menu.url) { try { new URL(restaurant.menu.url); } catch { fail('food', `${restaurant.name} has invalid menu URL`); } }
  if (!realStays.some((stay) => stay.id === restaurant.hotelId)) fail('hotel_anchor', `${restaurant.name} does not reference a confirmed hotel`);
}
checks.foodSourceAudit = failures.filter((item) => item.dimension === 'food').length === 0;

for (const shop of data.shopping) {
  if (!shop.source || !/^https?:\/\//.test(shop.source)) fail('shopping', `${shop.name} missing source`);
  if (!shop.recommendedDays?.length) fail('shopping', `${shop.name} missing route-day match`);
  if (!realStays.some((stay) => stay.id === shop.hotelId)) fail('hotel_anchor', `${shop.name} does not reference a confirmed hotel`);
}
checks.shoppingSourceAudit = failures.filter((item) => item.dimension === 'shopping').length === 0;
checks.confirmedHotelAnchorAudit = failures.filter((item) => item.dimension === 'hotel_anchor').length === 0;

const budgetTotal = data.budget.categories.reduce((sum, item) => sum + item.budget, 0);
if (budgetTotal !== data.budget.planTotal) fail('budget', `category plan ${budgetTotal} differs from planTotal ${data.budget.planTotal}`);
if (data.budget.planTotal > data.budget.hardCap) warn('budget', `current real commitments put plan ${data.budget.planTotal} over hard cap ${data.budget.hardCap}`);
const shopping = data.budget.categories.find((item) => item.id === 'shopping');
if (!shopping || shopping.budget < data.budget.shoppingFloor) fail('budget', 'shopping floor is not protected');
if (Number(data.budget.fixedCommitted.amount.toFixed(2)) !== committed) fail('budget', 'fixed hotel commitment differs from vouchers');
const recoveryTotal = data.budget.recoveryPlan.reduce((sum, item) => sum + item.targetSaving, 0);
if (recoveryTotal !== Math.max(0, data.budget.planTotal - data.budget.hardCap)) fail('budget', 'recovery plan does not exactly bridge the hard-cap gap');
checks.budgetAudit = failures.filter((item) => item.dimension === 'budget').length === 0;

for (const booking of data.bookings.items) if (!data.bookings.statuses.includes(booking.status)) fail('bookings', `${booking.id} has invalid status`);
const bookingIds = new Set(ids(data.bookings.items));
for (const task of data.tasks.items) {
  if (!data.tasks.statuses.includes(task.status)) fail('control_sync', `${task.id} has invalid task status`);
  if (task.linkedBookingId && !bookingIds.has(task.linkedBookingId)) fail('control_sync', `${task.id} links missing booking ${task.linkedBookingId}`);
}
checks.bookingAudit = failures.filter((item) => item.dimension === 'bookings').length === 0;
checks.bookingTaskSyncAudit = failures.filter((item) => item.dimension === 'control_sync').length === 0;

const urls = [
  ...data.options.map((item) => item.source), ...data.gyms.map((item) => item.source),
  ...data.restaurants.map((item) => item.source), ...data.shopping.map((item) => item.source), ...data.xhs.map((item) => item.url),
];
for (const value of urls) { try { new URL(value); } catch { fail('links', `invalid external URL ${value}`); } }
for (const topic of data.xhs) if (!topic.url.startsWith('https://www.xiaohongshu.com/search_result?keyword=')) fail('xhs', `${topic.id} is not a transparent search link`);
checks.externalLinkSyntax = failures.filter((item) => item.dimension === 'links').length === 0;
checks.xhsNoFabrication = failures.filter((item) => item.dimension === 'xhs').length === 0;

const coordinateKeys = new Map();
for (const place of data.places) {
  if (place.lat === null || place.lng === null || Math.abs(place.lat) > 90 || Math.abs(place.lng) > 180) fail('coordinates', `${place.id} has invalid coordinates`);
  const key = `${place.lat?.toFixed(5)},${place.lng?.toFixed(5)}`;
  if (coordinateKeys.has(key) && coordinateKeys.get(key) !== place.name) fail('locations', `${place.name} duplicates coordinates of ${coordinateKeys.get(key)}`);
  coordinateKeys.set(key, place.name);
}
checks.coordinateValidity = failures.filter((item) => item.dimension === 'coordinates').length === 0;
checks.duplicateLocationAudit = failures.filter((item) => item.dimension === 'locations').length === 0;

const freshnessCutoff = Date.now() - 120 * 86400000;
const dated = [...data.hotelBookings.items, ...data.restaurants, ...data.xhs].filter((item) => item.lastVerified ?? data.hotelBookings.verifiedAt);
for (const item of dated) if (new Date(`${item.lastVerified}T00:00:00Z`).getTime() < freshnessCutoff) warn('freshness', `${item.name ?? item.id} needs reality-data reverification`);
checks.freshnessLabelsPresent = dated.length === data.hotelBookings.items.length + data.restaurants.length + data.xhs.length;

if (data.conflicts.items.some((item) => !item.status)) fail('provenance', 'conflict without status');
if (!fs.existsSync(path.join(root, 'research', 'source-manifest.json'))) warn('provenance', 'source manifest missing');
checks.provenance = failures.filter((item) => item.dimension === 'provenance').length === 0;

const report = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  status: failures.length ? 'failed' : 'passed',
  summary: { failures: failures.length, warnings: warnings.length, days: data.days.length, editablePlanItems: data.dayPlans.days.reduce((sum, day) => sum + day.activeItems.length + day.alternatives.length, 0), entities: entityIds.size, places: data.places.length, options: data.options.length, images: requestedAssets.length, gyms: data.gyms.length, verifiedGyms: data.gyms.filter((gym) => !String(gym.dayPass).includes('确认') && !String(gym.hours).includes('确认')).length, realHotelBookings: realStays.length, realHotelNights: realStays.reduce((sum, stay) => sum + stay.nights, 0), realHotelCommittedCny: committed, transportSegments: data.transportRecommendations.segments.length, transportTargetDateCaptured: data.transportRecommendations.segments.filter((segment) => segment.candidates.every((candidate) => candidate.departure && candidate.arrival && candidate.priceCny != null)).length, doorToDoorSegments: data.transportRecommendations.segments.filter((segment) => segment.doorToDoor).length, restaurants: data.restaurants.length, verifiedMenus: data.restaurants.filter((item) => item.menu?.status === 'VERIFIED OFFICIAL MENU').length, shopping: data.shopping.length, dayRouteLegs: data.dayRoutes.reduce((sum, item) => sum + item.legs.length, 0), transitExecutionCards: data.transitDayExecution.length, deadlines: data.deadlines.length, survivalCities: data.survival.length, projectedTotalCny: data.budget.planTotal, hardCapDifferenceCny: data.budget.planTotal - data.budget.hardCap, xhsTopics: data.xhs.length, bookings: data.bookings.items.length, tasks: data.tasks.items.length, confirmedHotelImages: 'DEFERRED' },
  checks, failures, warnings,
};
fs.mkdirSync(path.join(root, 'audit'), { recursive: true });
fs.writeFileSync(path.join(root, 'audit', 'final-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
const state = {
  schema_version: 1,
  status: failures.length ? 'in_progress' : 'complete',
  stage: failures.length ? 'audit_failed' : 'complete',
  workflow: ['research','structured_data','render','audit','handoff'],
  source_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  checks,
  audit_report: 'audit/final-audit.json',
  handoff_allowed: failures.length === 0,
  final_response_allowed: failures.length === 0,
  continuation_required: failures.length > 0,
  next_required_action: failures.length ? 'Fix audit/final-audit.json failures and rerun pnpm audit.' : 'Handoff the runnable guide.',
  updated_at: new Date().toISOString(),
};
fs.writeFileSync(path.join(root, '.travel-build-state.json'), `${JSON.stringify(state, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
