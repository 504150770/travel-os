import { readdir, readFile, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const read = async (file) => JSON.parse(await readFile(join(root, 'data', file), 'utf8'));
const [images, restaurants, gyms, hotels] = await Promise.all([
  read('images.json'), read('restaurants.json'), read('gyms.json'), read('hotel-bookings.json'),
]);
const referenced = new Set([
  ...images.map((image) => image.file),
  ...restaurants.flatMap((item) => (item.images ?? item.imageSources ?? []).map((image) => image.file)),
  ...gyms.flatMap((item) => (item.images ?? []).map((image) => image.file)),
  ...hotels.items.flatMap((item) => item.images.map((image) => image.file)),
].filter(Boolean));
const roots = ['food', 'gym', 'hotels', 'places'].map((name) => join(root, 'public', 'images', name));
const walk = async (directory) => (await readdir(directory, { withFileTypes: true })).flatMap((entry) => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? [walk(path)] : [path];
});
const flatten = async (values) => (await Promise.all(values)).flat(Infinity);
const files = await flatten((await Promise.all(roots.map(async (directory) => {
  try { return await walk(directory); } catch { return []; }
}))).flat());
const removed = [];
for (const file of files) {
  const publicPath = `/${relative(join(root, 'public'), file).replaceAll('\\', '/')}`;
  if (referenced.has(publicPath)) continue;
  await rm(file);
  removed.push(publicPath);
}
console.log(JSON.stringify({ removed: removed.length, files: removed }, null, 2));
