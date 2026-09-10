import { readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const base = join(root, 'research', 'image-candidates');
for (const directory of await readdir(base, { withFileTypes: true })) {
  if (!directory.isDirectory()) continue;
  const folder = join(base, directory.name);
  const files = (await readdir(folder)).filter((file) => file.endsWith('.webp'));
  const width = 900;
  const cellWidth = 300;
  const cellHeight = 230;
  const rows = Math.ceil(files.length / 3);
  const composites = [];
  for (const [index, file] of files.entries()) {
    const image = await sharp(join(folder, file)).resize(cellWidth, 190, { fit: 'cover' }).toBuffer();
    const label = Buffer.from(
      `<svg width="${cellWidth}" height="40"><rect width="100%" height="100%" fill="#fff"/><text x="12" y="26" font-family="Arial" font-size="16" fill="#222">${basename(file, '.webp')}</text></svg>`,
    );
    const left = (index % 3) * cellWidth;
    const top = Math.floor(index / 3) * cellHeight;
    composites.push({ input: image, left, top }, { input: label, left, top: top + 190 });
  }
  await sharp({ create: { width, height: rows * cellHeight, channels: 3, background: '#f7f7f7' } })
    .composite(composites)
    .png()
    .toFile(join(base, `${directory.name}-contact.png`));
}
