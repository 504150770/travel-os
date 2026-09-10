import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const coverage = JSON.parse(await readFile(join(root, 'audit', 'asset-coverage.json'), 'utf8'));
const files = coverage.topFood.ids.map((id) => ({ id, file: join(root, 'public', 'images', 'food', `${id}.webp`) }));
const columns = 5;
const cellWidth = 190;
const cellHeight = 150;
const composites = [];
for (const [index, item] of files.entries()) {
  const left = (index % columns) * cellWidth;
  const top = Math.floor(index / columns) * cellHeight;
  const photo = await sharp(item.file).resize(cellWidth, 116, { fit: 'cover' }).toBuffer();
  const label = Buffer.from(`<svg width="${cellWidth}" height="34"><rect width="100%" height="100%" fill="#fff"/><text x="8" y="21" font-family="Arial" font-size="11" fill="#222">${item.id}</text></svg>`);
  composites.push({ input: photo, left, top }, { input: label, left, top: top + 116 });
}
await mkdir(join(root, 'research'), { recursive: true });
await sharp({ create: { width: columns * cellWidth, height: Math.ceil(files.length / columns) * cellHeight, channels: 3, background: '#f7f7f7' } })
  .composite(composites)
  .png()
  .toFile(join(root, 'research', 'priority-food-contact-sheet.png'));
