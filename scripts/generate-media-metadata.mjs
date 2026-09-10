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
const add = (row) => {
  if (!row.file) return;
  rows.push({
    file: row.file,
    caption: row.caption || '',
    source: row.source || 'Source recorded on entity',
    sourcePage: row.sourcePage || row.source || '',
    lastVerified: row.lastVerified || row.verifiedAt || '2026-09-10',
    role: row.role || 'Entity',
    entityId: row.entityId || row.placeId || '',
    ...(row.originalUrl ? { originalUrl: row.originalUrl } : {}),
  });
};

for (const image of images) add({ ...image, entityId: image.entityId || image.placeId || `day-${image.dayId}` });
for (const stay of hotelData.items) for (const image of stay.images || []) add(image);
for (const restaurant of restaurants) for (const image of restaurant.imageSources || []) add(image);
for (const gym of gyms) if (gym.image) add({
  file: gym.image,
  caption: `${gym.name} official fitness visual`,
  source: 'Official gym website',
  sourcePage: gym.source,
  lastVerified: gym.lastVerified || '2026-09-10',
  role: 'Gym',
  entityId: gym.id,
});
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
