import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const data = {
  trip: readJson('data/trip.json'), days: readJson('data/days.json'), places: readJson('data/places.json'),
  options: readJson('data/options.json'), images: readJson('data/images.json'), gyms: readJson('data/gyms.json'), hotels: readJson('data/hotels.json'),
  bookings: readJson('data/bookings.json'), budget: readJson('data/budget.json'), checklist: readJson('data/checklist.json'),
  essentials: readJson('data/essentials.json'), conflicts: readJson('data/conflicts.json'),
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
unique(ids(data.hotels.hotels), 'hotel ids');
unique(ids(data.bookings.items), 'booking ids');

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

for (const city of data.trip.cities.map((item) => item.name)) {
  const choices = data.options.filter((item) => item.city === city);
  if (choices.length !== 4) fail('options', `${city} has ${choices.length} optional place choices`);
}
for (const option of data.options) {
  if (!option.recommendedDays.every((day) => day >= 1 && day <= 18)) fail('options', `${option.id} has invalid recommended day`);
  if (!option.source.startsWith('https://')) fail('options', `${option.id} missing source URL`);
}
checks.optionAudit = failures.filter((item) => item.dimension === 'options').length === 0;

const requestedAssets = [data.trip.coverImage, ...data.images.map((item) => item.file), ...data.gyms.map((item) => item.image)];
unique(requestedAssets, 'asset paths');
const hashes = new Map();
for (const asset of requestedAssets) {
  const local = path.join(root, 'public', asset.replace(/^\//, ''));
  if (!fs.existsSync(local)) { fail('media', `missing ${asset}`); continue; }
  const bytes = fs.readFileSync(local);
  const header = bytes.subarray(0, 12).toString('ascii');
  if (!header.startsWith('RIFF') || !header.includes('WEBP')) fail('media', `broken or non-WebP asset ${asset}`);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  if (hashes.has(hash)) fail('media', `duplicate image bytes: ${asset} and ${hashes.get(hash)}`);
  hashes.set(hash, asset);
}
if (!data.images.every((image) => image.visuallyReviewed === true)) fail('media', 'Visual image lacks review flag');
checks.imageDeduplication = failures.filter((item) => item.dimension === 'media' && item.message.includes('duplicate')).length === 0;
checks.brokenImageDetection = failures.filter((item) => item.dimension === 'media' && !item.message.includes('duplicate')).length === 0;

const cityNames = data.trip.cities.map((city) => city.name);
const hotelCity = (value) => value.startsWith('威尼斯') ? '威尼斯' : value;
for (const city of cityNames) {
  const list = data.hotels.hotels.filter((hotel) => hotelCity(hotel.city) === city);
  if (list.length !== 4) fail('hotels', `${city} has ${list.length} hotel candidates`);
  if (list.filter((hotel) => hotel.selected).length !== 1) fail('hotels', `${city} must have one selected hotel`);
  for (const hotel of list) {
    for (const key of ['street','wall','corridor','mechanical']) if (!hotel.noise?.[key]) fail('hotels', `${hotel.name} missing noise.${key}`);
  }
}
const selectedTotal = data.hotels.hotels.filter((hotel) => hotel.selected).reduce((sum, hotel) => sum + (hotel.priceRefundable ?? 0), 0);
if (selectedTotal !== data.hotels.selectedTotal) fail('hotels', `selected hotel total ${selectedTotal} differs from declared ${data.hotels.selectedTotal}`);
if (selectedTotal > data.hotels.hardMax) fail('hotels', 'selected hotels exceed hard max');
checks.hotelAudit = failures.filter((item) => item.dimension === 'hotels').length === 0;

if (data.gyms.length < 8 || data.gyms.length > 10) fail('gyms', 'gym count must be 8–10');
if (data.gyms.filter((gym) => gym.photogenicRank).length !== 5) fail('gyms', 'Most Photogenic list must contain exactly 5 gyms');
for (const gym of data.gyms) if (!gym.dayPass) fail('gyms', `${gym.name} missing day pass state`);
checks.gymAudit = failures.filter((item) => item.dimension === 'gyms').length === 0;

const budgetTotal = data.budget.categories.reduce((sum, item) => sum + item.budget, 0);
if (budgetTotal !== data.budget.planTotal) fail('budget', `category plan ${budgetTotal} differs from planTotal ${data.budget.planTotal}`);
if (data.budget.planTotal > data.budget.hardCap) fail('budget', 'plan exceeds hard cap');
const shopping = data.budget.categories.find((item) => item.id === 'shopping');
if (!shopping || shopping.budget < data.budget.shoppingFloor) fail('budget', 'shopping floor is not protected');
checks.budgetAudit = failures.filter((item) => item.dimension === 'budget').length === 0;

for (const booking of data.bookings.items) if (!data.bookings.statuses.includes(booking.status)) fail('bookings', `${booking.id} has invalid status`);
checks.bookingAudit = failures.filter((item) => item.dimension === 'bookings').length === 0;

if (data.conflicts.items.some((item) => !item.status)) fail('provenance', 'conflict without status');
if (!fs.existsSync(path.join(root, 'research', 'source-manifest.json'))) warn('provenance', 'source manifest missing');
checks.provenance = failures.filter((item) => item.dimension === 'provenance').length === 0;

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: failures.length ? 'failed' : 'passed',
  summary: { failures: failures.length, warnings: warnings.length, days: data.days.length, places: data.places.length, options: data.options.length, images: requestedAssets.length, gyms: data.gyms.length, hotels: data.hotels.hotels.length, bookings: data.bookings.items.length },
  checks, failures, warnings,
};
fs.mkdirSync(path.join(root, 'audit'), { recursive: true });
fs.writeFileSync(path.join(root, 'audit', 'final-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
const state = {
  schema_version: 1,
  status: failures.length ? 'in_progress' : 'complete',
  stage: failures.length ? 'audit_failed' : 'complete',
  workflow: ['research','structured_data','render','audit','handoff'],
  source_commit: '7372e4762eea2767bd0a49c949f33c70bed92a67',
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
