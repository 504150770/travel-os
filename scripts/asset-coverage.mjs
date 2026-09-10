import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (file) => JSON.parse(readFileSync(join(root, file), 'utf8'));
const images = read('data/images.json');
const hotels = read('data/hotel-bookings.json').items;
const days = read('data/days.json');
const plan = read('data/day-plans.json').days;
const restaurants = read('data/restaurants.json');
const gyms = read('data/gyms.json');
const shopping = read('data/shopping.json');
const places = read('data/places.json');
const options = read('data/options.json');
const activities = read('data/activities.json');
const missing = read('audit/missing-images.json');

const publicDir = join(root, 'public');
const localPath = (value) =>
  typeof value === 'string' && value.startsWith('/')
    ? join(publicDir, value.slice(1).replaceAll('/', '\\'))
    : null;
const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

const imageByEntity = new Map();
for (const image of images) {
  const entityId = image.entityId ?? image.placeId;
  if (!entityId) continue;
  const rows = imageByEntity.get(entityId) ?? [];
  rows.push(image);
  imageByEntity.set(entityId, rows);
}
for (const item of restaurants) {
  const files = [item.dishImage, item.restaurantImage, item.environmentImage].filter(Boolean);
  if (files.length) imageByEntity.set(item.id, files.map((file) => ({ file })));
}
for (const item of gyms) {
  if (item.image) imageByEntity.set(item.id, [{ file: item.image }]);
}
for (const item of shopping) {
  if (item.image) imageByEntity.set(item.id, [{ file: item.image }]);
}

const entities = new Map(
  [...places, ...options, ...restaurants, ...gyms, ...shopping, ...activities].map((item) => [item.id, item]),
);
const activeIds = [...new Set(plan.flatMap((day) => day.activeItems.map((item) => item.entityId)))];
const currentPlanIds = activeIds.filter((id) => entities.has(id) && !id.startsWith('activity-'));
const covered = (ids) => ids.filter((id) => (imageByEntity.get(id)?.length ?? 0) > 0);

const selectedFoodIds = new Set();
for (const day of days) {
  const city = day.city.includes('梵蒂冈')
    ? '罗马'
    : day.city.includes('Mestre')
      ? '威尼斯'
      : day.city.split(' → ').at(-1);
  const active = new Set(plan[day.day - 1].activeItems.map((item) => item.entityId));
  const items = restaurants
    .filter((item) => item.city === city && item.recommendedDays?.includes(day.day))
    .sort(
      (a, b) =>
        Number(!active.has(a.id)) - Number(!active.has(b.id)) ||
        Number(a.hotelPriority ?? 99) - Number(b.hotelPriority ?? 99),
    );
  const used = new Set();
  const choose = (test, fallback = true) => {
    const picked = items.find((item) => !used.has(item.id) && test(item)) ??
      (fallback ? items.find((item) => !used.has(item.id)) : undefined);
    if (picked) {
      used.add(picked.id);
      selectedFoodIds.add(picked.id);
    }
  };
  choose((item) => Number(item.hotelPriority ?? 99) <= 2);
  choose((item) => ['Lunch', 'Dinner'].includes(String(item.category)));
  choose((item) => ['Breakfast', 'Snack'].includes(String(item.category)));
  choose((item) => /solo|单人|counter|quick/i.test(`${item.dishes} ${item.reservation} ${item.soloFriendly}`));
  choose((item) => ['Cafe', 'Dessert'].includes(String(item.category)), false);
}

const topGymIds = [...new Set(
  ['罗马', '佛罗伦萨', '威尼斯', '维也纳', '布拉格', '巴黎'].flatMap((city) =>
    gyms
      .filter((item) => (item.city.includes('Mestre') ? '威尼斯' : item.city) === city)
      .sort((a, b) => Number(a.hotelPriority ?? 99) - Number(b.hotelPriority ?? 99))
      .slice(0, 1)
      .map((item) => item.id),
  ),
)];

const refs = [
  ...images.map((item) => ({ entityId: item.entityId ?? item.placeId ?? `day-${item.dayId}`, file: item.file })),
  ...hotels.flatMap((item) => item.images.map((image) => ({ entityId: item.id, file: image.file }))),
  ...restaurants.flatMap((item) => [item.dishImage, item.restaurantImage, item.environmentImage].filter(Boolean).map((file) => ({ entityId: item.id, file }))),
  ...gyms.filter((item) => item.image).map((item) => ({ entityId: item.id, file: item.image })),
  ...shopping.filter((item) => item.image).map((item) => ({ entityId: item.id, file: item.image })),
];
const brokenImages = refs.filter(({ file }) => {
  if (!file) return false;
  const path = localPath(file);
  return !path || !existsSync(path) || statSync(path).size === 0;
});

const hashes = new Map();
for (const { entityId, file } of refs) {
  const path = localPath(file);
  if (!path || !existsSync(path)) continue;
  const hash = createHash('sha256').update(readFileSync(path)).digest('hex');
  const rows = hashes.get(hash) ?? [];
  rows.push({ entityId, file });
  hashes.set(hash, rows);
}
const duplicateImages = [...hashes.values()].filter((rows) => rows.length > 1);
const hotelComplete = hotels.filter((hotel) =>
  ['room', 'bathroom', 'entrance'].every((role) =>
    hotel.images.some((image) => image.role.toLowerCase() === role && image.file),
  ),
);
const heroDays = new Set(images.filter((image) => image.role === 'hero' && image.dayId).map((image) => image.dayId));
const publicImages = walk(join(root, 'public', 'images'));
const publicImagesBytes = publicImages.reduce((sum, file) => sum + statSync(file).size, 0);

const result = {
  generatedAt: new Date().toISOString(),
  originalMissingImages: 146,
  remainingMissingImages: missing.total,
  addedImages: Math.max(0, 146 - missing.total),
  publicImages: { count: publicImages.length, bytes: publicImagesBytes },
  hotel: { complete: hotelComplete.length, total: hotels.length, ids: hotelComplete.map((item) => item.id) },
  hero: { covered: heroDays.size, total: days.length, missingDays: days.filter((day) => !heroDays.has(day.day)).map((day) => day.day) },
  currentPlan: {
    covered: covered(currentPlanIds).length,
    total: currentPlanIds.length,
    percentage: Math.round((covered(currentPlanIds).length / currentPlanIds.length) * 100),
    missing: currentPlanIds.filter((id) => !imageByEntity.has(id)),
  },
  topFood: {
    covered: covered([...selectedFoodIds]).length,
    total: selectedFoodIds.size,
    percentage: Math.round((covered([...selectedFoodIds]).length / selectedFoodIds.size) * 100),
    ids: [...selectedFoodIds],
    missing: [...selectedFoodIds].filter((id) => !imageByEntity.has(id)),
  },
  topGym: {
    covered: covered(topGymIds).length,
    total: topGymIds.length,
    percentage: Math.round((covered(topGymIds).length / topGymIds.length) * 100),
    ids: topGymIds,
  },
  brokenImages,
  duplicateImages,
  missingByCategory: Object.groupBy(missing.items, (item) => item.category),
};
result.missingByCategory = Object.fromEntries(
  Object.entries(result.missingByCategory).map(([category, items]) => [category, items.length]),
);

if (process.argv.includes('--write')) {
  writeFileSync(join(root, 'audit', 'asset-coverage.json'), `${JSON.stringify(result, null, 2)}\n`);
}
console.log(JSON.stringify(result, null, 2));
