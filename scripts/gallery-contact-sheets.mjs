import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const restaurants = JSON.parse(await readFile(join(root, 'data', 'restaurants.json'), 'utf8'));
const coverage = JSON.parse(await readFile(join(root, 'audit', 'asset-coverage.json'), 'utf8'));
const priority = new Set(coverage.topFood.ids);
const groups = Object.groupBy(restaurants.filter((item) => priority.has(item.id)), (item) => item.city);
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

await mkdir(join(root, 'research', 'gallery-sheets'), { recursive: true });
for (const [city, items] of Object.entries(groups)) {
  const columns = 5;
  const cellWidth = 210;
  const cellHeight = 170;
  const rows = items.length;
  const composites = [];
  for (const [row, item] of items.entries()) {
    for (const [column, image] of (item.images ?? []).slice(0, columns).entries()) {
      const file = join(root, 'public', image.file.slice(1));
      const photo = await sharp(file).resize(cellWidth, 132, { fit: 'cover' }).toBuffer();
      const label = Buffer.from(`<svg width="${cellWidth}" height="38"><rect width="100%" height="100%" fill="#fff"/><text x="7" y="15" font-family="Arial" font-size="10" fill="#222">${escape(item.id)}</text><text x="7" y="29" font-family="Arial" font-size="10" fill="#666">${column + 1} · ${escape(image.role)}</text></svg>`);
      composites.push({ input: photo, left: column * cellWidth, top: row * cellHeight }, { input: label, left: column * cellWidth, top: row * cellHeight + 132 });
    }
  }
  await sharp({ create: { width: columns * cellWidth, height: rows * cellHeight, channels: 3, background: '#ececec' } })
    .composite(composites)
    .png()
    .toFile(join(root, 'research', 'gallery-sheets', `${city}.png`));
}
