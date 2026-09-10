import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const read = async (file) => JSON.parse(await readFile(join(root, 'data', file), 'utf8'));
const [images, hotelData, restaurants, gyms, shopping] = await Promise.all([
  read('images.json'),
  read('hotel-bookings.json'),
  read('restaurants.json'),
  read('gyms.json'),
  read('shopping.json'),
]);
const rows = [];
const recordedSourceLabel = (value) => {
  try {
    const host = new URL(value).hostname;
    if (host.includes('masalledesport.com')) return 'Ma Salle de Sport';
    if (host.includes('palestre.fitness')) return 'Palestre.Fitness venue listing';
  } catch { /* retain neutral label */ }
  return 'Source recorded on entity';
};
const add = (row) => {
  if (!row.file) return;
  rows.push({
    file: row.file,
    caption: row.caption || '',
    source: row.source || row.credit || 'Source recorded on entity',
    sourcePage: row.sourcePage || row.source || '',
    lastVerified: row.lastVerified || row.verifiedAt || '2026-09-10',
    role: row.role || 'Entity',
    entityId: row.entityId || row.placeId || '',
    ...(row.originalUrl ? { originalUrl: row.originalUrl } : {}),
    ...(row.matchesDishes ? { matchesDishes: row.matchesDishes } : {}),
  });
};

for (const image of images) add({ ...image, entityId: image.entityId || image.placeId || `day-${image.dayId}` });
for (const stay of hotelData.items) for (const image of stay.images || []) add(image);
for (const restaurant of restaurants) {
  const gallery = restaurant.images || restaurant.imageSources || [];
  for (const image of gallery) add({ ...image, entityId: image.entityId || restaurant.id });
}
for (const gym of gyms) {
  const gallery = gym.images || (gym.image ? [{
    file: gym.image,
    caption: `${gym.name} official fitness visual`,
    source: recordedSourceLabel(gym.source),
    sourcePage: gym.source,
    lastVerified: gym.lastVerified || gym.verifiedAt || '2026-09-10',
    role: 'equipment',
    entityId: gym.id,
  }] : []);
  for (const image of gallery) add({ ...image, entityId: image.entityId || gym.id });
}
for (const shop of shopping) if (shop.image) add({
  file: shop.image,
  caption: `${shop.name} official venue visual`,
  source: 'Official venue website',
  sourcePage: shop.source,
  lastVerified: shop.verifiedAt || '2026-09-10',
  role: 'Shopping',
  entityId: shop.id,
});

const unique = [...new Map(rows.map((row) => [`${row.entityId}|${row.file}`, row])).values()]
  .sort((a, b) => a.entityId.localeCompare(b.entityId) || a.role.localeCompare(b.role));
await writeFile(join(root, 'data', 'media-metadata.json'), `${JSON.stringify(unique, null, 2)}\n`);
console.log(`Generated ${unique.length} traceable media metadata records.`);
