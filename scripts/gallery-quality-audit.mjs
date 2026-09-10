import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (file) => JSON.parse(readFileSync(join(root, file), 'utf8'));
const restaurants = read('data/restaurants.json');
const gyms = read('data/gyms.json');
const hotels = read('data/hotel-bookings.json').items;
const placeImages = read('data/images.json');
const dayPlans = read('data/day-plans.json').days;
const places = read('data/places.json');
const days = read('data/days.json');

const normalizedRole = (image) => String(image.role || '').toLowerCase();
const gallery = (item, legacy = []) => item.images ?? item.imageSources ?? legacy.filter(Boolean).map((file) => ({ file }));
const roles = (images) => [...new Set(images.map(normalizedRole).filter(Boolean))];
const validFiles = (images) => images.filter((image) => {
  if (!image.file?.startsWith('/')) return false;
  const file = join(root, 'public', image.file.slice(1));
  return existsSync(file) && statSync(file).size > 0;
});
const hasRole = (images, ...wanted) => images.some((image) => wanted.includes(normalizedRole(image)));
const roleOrder = { cover: 0, dish: 1, equipment: 1, room: 1, overview: 1, hero: 1, stop: 1, interior: 2, exterior: 3, entrance: 4, bathroom: 5, 'photo-angle': 6, detail: 7 };
const cover = (images) => images.find((image) => image.isCover) ?? [...images].sort((a, b) =>
  (roleOrder[normalizedRole(a)] ?? 99) - (roleOrder[normalizedRole(b)] ?? 99) || Number(a.priority ?? 999) - Number(b.priority ?? 999),
)[0];
const base = (id, name, type, rawImages) => {
  const images = validFiles(rawImages);
  const selectedCover = cover(images);
  return {
    id,
    name,
    type,
    imageCount: images.length,
    roleCoverage: roles(images),
    hasUsefulCover: Boolean(selectedCover?.file && !['logo', 'placeholder'].includes(normalizedRole(selectedCover))),
    hasEntrance: hasRole(images, 'entrance', 'exterior'),
    hasInterior: hasRole(images, 'interior', 'room'),
    hasSignatureDish: hasRole(images, 'dish'),
    coverRole: normalizedRole(selectedCover),
  };
};

const selectedFoodIds = new Set();
for (const day of days) {
  const city = day.city.includes('梵蒂冈') ? '罗马' : day.city.includes('Mestre') ? '威尼斯' : day.city.split(' → ').at(-1);
  const active = new Set(dayPlans[day.day - 1].activeItems.map((item) => item.entityId));
  const items = restaurants.filter((item) => item.city === city && item.recommendedDays?.includes(day.day))
    .sort((a, b) => Number(!active.has(a.id)) - Number(!active.has(b.id)) || Number(a.hotelPriority ?? 99) - Number(b.hotelPriority ?? 99));
  const used = new Set();
  const choose = (test, fallback = true) => {
    const picked = items.find((item) => !used.has(item.id) && test(item)) ?? (fallback ? items.find((item) => !used.has(item.id)) : undefined);
    if (picked) { used.add(picked.id); selectedFoodIds.add(picked.id); }
  };
  choose((item) => Number(item.hotelPriority ?? 99) <= 2);
  choose((item) => ['Lunch', 'Dinner'].includes(String(item.category)));
  choose((item) => ['Breakfast', 'Snack'].includes(String(item.category)));
  choose((item) => /solo|单人|counter|quick/i.test(`${item.dishes} ${item.reservation} ${item.soloFriendly}`));
  choose((item) => ['Cafe', 'Dessert'].includes(String(item.category)), false);
}
const topGymIds = new Set(['罗马', '佛罗伦萨', '威尼斯', '维也纳', '布拉格', '巴黎'].flatMap((city) => gyms
  .filter((item) => (item.city.includes('Mestre') ? '威尼斯' : item.city) === city)
  .sort((a, b) => Number(a.hotelPriority ?? 99) - Number(b.hotelPriority ?? 99)).slice(0, 1).map((item) => item.id)));
const placeIds = new Set(places.map((item) => item.id));
const currentPlaceIds = new Set(dayPlans.flatMap((day) => day.activeItems.map((item) => item.entityId)).filter((id) => placeIds.has(id)));

const food = restaurants.filter((item) => selectedFoodIds.has(item.id)).map((item) => {
  const row = base(item.id, item.name, 'food', gallery(item, [item.dishImage, item.restaurantImage, item.environmentImage]));
  const images = gallery(item, [item.dishImage, item.restaurantImage, item.environmentImage]);
  const dishCount = validFiles(images).filter((image) => normalizedRole(image) === 'dish').length;
  return { ...row, dishCount, galleryReady: row.imageCount >= 4 && dishCount >= 2 && (row.hasEntrance || row.hasInterior) && row.coverRole === 'dish' };
});
const gym = gyms.filter((item) => topGymIds.has(item.id)).map((item) => {
  const row = base(item.id, item.name, 'gym', gallery(item, [item.image]));
  return { ...row, galleryReady: row.imageCount >= 3 && hasRole(gallery(item, [item.image]), 'equipment') && row.hasUsefulCover };
});
const hotel = hotels.map((item) => {
  const row = base(item.id, item.hotelName, 'hotel', item.images || []);
  return { ...row, galleryReady: row.imageCount >= 5 && row.hasEntrance && hasRole(item.images || [], 'room') && hasRole(item.images || [], 'bathroom') && row.hasUsefulCover };
});
const groupedPlaceImages = new Map();
for (const image of placeImages) {
  const id = image.entityId ?? image.placeId;
  if (!id) continue;
  groupedPlaceImages.set(id, [...(groupedPlaceImages.get(id) ?? []), image]);
}
const place = places.filter((item) => currentPlaceIds.has(item.id)).map((item) => {
  const row = base(item.id, item.name, 'place', groupedPlaceImages.get(item.id) || []);
  return { ...row, galleryReady: row.imageCount >= 3 && row.hasUsefulCover };
});

const categories = { food, gym, hotel, place };
const summary = Object.fromEntries(
  Object.entries(categories).map(([key, rows]) => [key, {
    ready: rows.filter((row) => row.galleryReady).length,
    total: rows.length,
    percentage: rows.length ? Math.round(rows.filter((row) => row.galleryReady).length / rows.length * 100) : 100,
    averageImages: rows.length ? Number((rows.reduce((sum, row) => sum + row.imageCount, 0) / rows.length).toFixed(2)) : 0,
    unmet: rows.filter((row) => !row.galleryReady).map((row) => row.id),
  }]),
);
const all = Object.values(categories).flat();
const referenced = new Set(all.flatMap((row) => {
  if (row.type === 'food') return gallery(restaurants.find((item) => item.id === row.id) || {}, []).map((image) => image.file);
  if (row.type === 'gym') return gallery(gyms.find((item) => item.id === row.id) || {}, []).map((image) => image.file);
  if (row.type === 'hotel') return (hotels.find((item) => item.id === row.id)?.images || []).map((image) => image.file);
  return (groupedPlaceImages.get(row.id) || []).map((image) => image.file);
}).filter(Boolean));
const totalBytes = [...referenced].reduce((sum, file) => {
  const local = file.startsWith('/') ? join(root, 'public', file.slice(1)) : '';
  return sum + (local && existsSync(local) ? statSync(local).size : 0);
}, 0);
const report = {
  generatedAt: new Date().toISOString(),
  criteria: { food: '>=4 images, >=2 dishes, environment/entrance, dish cover', gym: '>=3 images with equipment', hotel: '>=5 images with entrance/room/bathroom', place: '>=3 images' },
  summary,
  GalleryReadyCoverage: { ready: all.filter((row) => row.galleryReady).length, total: all.length, percentage: Math.round(all.filter((row) => row.galleryReady).length / all.length * 100) },
  referencedGalleryBytes: totalBytes,
  entities: categories,
};
if (process.argv.includes('--write')) writeFileSync(join(root, 'audit', 'gallery-quality.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
