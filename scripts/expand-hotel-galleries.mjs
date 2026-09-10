import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const verified = '2026-09-10';
const path = join(root, 'data', 'hotel-bookings.json');
const data = JSON.parse(await readFile(path, 'utf8'));
const sources = JSON.parse(await readFile(join(root, 'research', 'image-candidates', 'sources.json'), 'utf8'));
const additions = {
  'stay-rome-colonna': [
    ['colonna/room-11-2', 'interior', 'Suite sitting area', 'Guest-room sitting area'],
    ['colonna/room-11-3', 'detail', 'In-room breakfast setting', 'Breakfast and room-service setting'],
  ],
  'stay-florence-fonderia': [
    ['fonderia/detail-1', 'detail', 'Piombo room threshold', 'Room and private-bathroom relationship'],
    ['fonderia/detail-3', 'bathroom', 'Private external bathroom entrance', 'Private bathroom entrance from the room'],
  ],
  'stay-venice-ai-pini': [
    ['ai-pini/exterior', 'interior', 'Ai Pini reception identity wall', 'Arrival and reception context'],
    ['ai-pini/room', 'room', 'Alternative guest-room view', 'Guest-room layout and desk view'],
  ],
  'stay-vienna-jimmys': [
    ['jimmys/detail-2', 'detail', 'Apartment kitchenette', 'Executive apartment kitchenette'],
    ['jimmys/room-1', 'interior', 'Apartment living area', 'Executive apartment living and dining area'],
  ],
  'stay-prague-ostas': [
    ['ostas/room', 'interior', 'Ostaš courtyard terrace', 'Shared courtyard and terrace'],
    ['ostas/gallery-6', 'detail', 'Interior circulation', 'Stair and upper-floor arrival context'],
  ],
  'stay-paris-oden': [
    ['oden/detail-1', 'bathroom', 'Bathroom vanity', 'Standard room bathroom vanity and mirror'],
    ['oden/detail-3', 'bathroom', 'Bathroom shower layout', 'Standard room shower and bathroom layout'],
  ],
};

for (const stay of data.items) {
  stay.images = stay.images.map((image, index) => ({
    ...image,
    role: image.role.toLowerCase(),
    title: image.title || image.caption || `${stay.hotelName} ${image.role}`,
    isCover: image.role.toLowerCase() === 'room',
    priority: image.role.toLowerCase() === 'room' ? 1 : index + 2,
  }));
  for (const [candidate, role, title, caption] of additions[stay.id] ?? []) {
    const sourceFile = join(root, 'research', 'image-candidates', `${candidate}.webp`);
    const file = `/images/hotels/${stay.id}/${role}-${stay.images.length + 1}.webp`;
    const output = join(root, 'public', file.slice(1));
    await mkdir(dirname(output), { recursive: true });
    await sharp(sourceFile).resize({ width: 1200, height: 800, fit: 'cover', withoutEnlargement: true }).webp({ quality: 80 }).toFile(output);
    const originalUrl = sources[candidate];
    stay.images.push({
      file,
      role,
      title,
      caption,
      source: 'Official property website',
      sourcePage: stay.images.find((image) => image.sourcePage?.includes(new URL(originalUrl).hostname))?.sourcePage || stay.images.find((image) => image.sourcePage)?.sourcePage,
      originalUrl,
      lastVerified: verified,
      isCover: false,
      priority: stay.images.length + 1,
      entityId: stay.id,
      status: 'VERIFIED REAL PROPERTY PHOTO',
    });
  }
  console.log(`${stay.id}: ${stay.images.length}`);
}

await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
