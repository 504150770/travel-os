import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (file) => JSON.parse(readFileSync(join(root, file), 'utf8'));
const images = read('data/images.json');
const restaurants = read('data/restaurants.json');
const gyms = read('data/gyms.json');
const hotels = read('data/hotel-bookings.json').items;
const quality = read('audit/gallery-quality.json');
const role = (image) => String(image.role || '').toLowerCase();
const valid = (image) => image?.file?.startsWith('/') && existsSync(join(root, 'public', image.file.slice(1)));
const choose = (rows, test, excluded = new Set()) => rows.find((image) => valid(image) && !excluded.has(image.file) && test(image));
const selected = [];
const add = (image, group, entityId) => { if (valid(image)) selected.push({ file: image.file, group, entityId, role: role(image) }); };

for (let day = 1; day <= 18; day += 1) add(images.find((image) => image.dayId === day && role(image) === 'hero'), 'dayHero', `day-${day}`);
for (const stay of hotels) {
  const rows = stay.images || [];
  add(rows.find((image) => image.isCover) || choose(rows, () => true), 'hotelCover', stay.id);
  for (const wanted of ['entrance', 'room', 'bathroom']) add(choose(rows, (image) => role(image) === wanted), `hotel${wanted}`, stay.id);
}
for (const row of quality.entities.place) {
  const rows = images.filter((image) => (image.entityId || image.placeId) === row.id);
  const used = new Set();
  const cover = rows.find((image) => image.isCover) || choose(rows, () => true);
  add(cover, 'placeCover', row.id); if (cover) used.add(cover.file);
  add(choose(rows, () => true, used), 'placeAux', row.id);
}
for (const row of quality.entities.food) {
  const entity = restaurants.find((item) => item.id === row.id);
  const rows = entity?.images || entity?.imageSources || [];
  const used = new Set();
  const cover = rows.find((image) => image.isCover) || choose(rows, (image) => role(image) === 'dish') || choose(rows, () => true);
  add(cover, 'foodCover', row.id); if (cover) used.add(cover.file);
  const signature = choose(rows, (image) => role(image) === 'dish', used); add(signature, 'foodDish', row.id); if (signature) used.add(signature.file);
  add(choose(rows, (image) => ['entrance', 'interior', 'exterior'].includes(role(image)), used), 'foodContext', row.id);
}
for (const row of quality.entities.gym) {
  const entity = gyms.find((item) => item.id === row.id);
  const rows = entity?.images || [];
  const cover = rows.find((image) => image.isCover) || choose(rows, () => true);
  add(cover, 'gymCover', row.id);
  add(choose(rows, (image) => role(image) === 'equipment', new Set(cover ? [cover.file] : [])) || choose(rows, (image) => role(image) === 'equipment'), 'gymEquipment', row.id);
}

const coreRoutes = ['/', '/?view=home', '/?view=trip&day=3', '/?view=more&tab=backup', '/manifest.webmanifest', '/sw.js', '/offline-core.json'];
const assetRows = [...new Map(selected.map((item) => [item.file, item])).values()];
const mediaBytes = assetRows.reduce((sum, item) => sum + statSync(join(root, 'public', item.file.slice(1))).size, 0);
const hash = createHash('sha256');
for (const item of assetRows.sort((a, b) => a.file.localeCompare(b.file))) hash.update(item.file).update(readFileSync(join(root, 'public', item.file.slice(1))));
for (const file of ['package.json', 'next.config.ts', 'public/sw.js', 'components/media-gallery.tsx', 'components/offline-pack-control.tsx', 'components/travel-guide-v3.tsx']) hash.update(file).update(readFileSync(join(root, file)));
const version = hash.digest('hex').slice(0, 12);
const assets = [...coreRoutes, ...assetRows.map((item) => item.file)];
const manifest = { generatedAt: new Date().toISOString(), version, assetCount: assets.length, mediaAssetCount: assetRows.length, totalBytes: mediaBytes, assets, selection: assetRows };
writeFileSync(join(root, 'public', 'offline-core.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const expected = { dayHero: 18, hotels: 6, places: quality.entities.place.length, food: quality.entities.food.length, gym: quality.entities.gym.length };
const entityCoverage = (group) => new Set(selected.filter((item) => item.group === group).map((item) => item.entityId)).size;
const coverage = {
  dayHero: entityCoverage('dayHero'), hotels: new Set(selected.filter((item) => item.group.startsWith('hotel')).map((item) => item.entityId)).size,
  places: entityCoverage('placeCover'), food: entityCoverage('foodCover'), gym: entityCoverage('gymCover'),
};
const report = { generatedAt: manifest.generatedAt, version, assetCount: assets.length, mediaAssetCount: assetRows.length, totalBytes: mediaBytes, expected, coverage, passed: Object.keys(expected).every((key) => coverage[key] === expected[key]) };
writeFileSync(join(root, 'audit', 'offline-core.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
