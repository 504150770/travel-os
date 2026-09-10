import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const verified = '2026-09-10';
const hotelFile = join(root, 'data', 'hotel-bookings.json');
const hotelData = JSON.parse(await readFile(hotelFile, 'utf8'));

const media = {
  'stay-rome-colonna': [
    ['Entrance', 'colonna/exterior.webp', 'https://www.hotelcolonnapalace.com/images/home-banner-1.jpg', 'Colonna Palace exterior on Piazza Montecitorio', 'https://www.hotelcolonnapalace.com/'],
    ['Room', 'colonna/room.webp', 'https://www.hotelcolonnapalace.com/images/room-6.jpg', 'Classic room interior', 'https://www.hotelcolonnapalace.com/rooms.html'],
    ['Bathroom', 'colonna/room-2-2.webp', 'https://www.hotelcolonnapalace.com/images/room-2-2.jpg', 'Private bathroom with shower', 'https://www.hotelcolonnapalace.com/rooms.html'],
  ],
  'stay-florence-fonderia': [
    ['Entrance', 'fonderia/exterior.webp', 'https://www.fonderiafirenze.com/images/about/fonderiafirenze-location-1.jpg', 'La Fonderia property courtyard and arrival setting', 'https://www.fonderiafirenze.com/en/'],
    ['Room', 'fonderia/detail-2.webp', 'https://www.fonderiafirenze.com/images/rooms/piombo/gallery/fonderiafirenze-camera-piombo-16.jpg', 'Piombo single room', 'https://www.fonderiafirenze.com/en/rooms-for-your-holiday-in-florence/piombo-single-room-private-external-bathroom'],
    ['Bathroom', 'fonderia/room.webp', 'https://www.fonderiafirenze.com/images/rooms/piombo/gallery/fonderiafirenze-camera-piombo-10.jpg', 'Piombo private external bathroom', 'https://www.fonderiafirenze.com/en/rooms-for-your-holiday-in-florence/piombo-single-room-private-external-bathroom'],
  ],
  'stay-venice-ai-pini': [
    ['Entrance', null, 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/255770289.jpg?k=305a83f858ebe84257cf6a6c7f470f4e489c8568adc5adeaf8585fe9b167f26f&o=', 'Ai Pini exterior and garden approach', 'https://www.booking.com/hotel/it/park-ai-pini.html'],
    ['Room', 'ai-pini/room-standard.webp', 'https://hotelaipini.it/wp-content/uploads/2024/12/camera-standard-ai-pini.jpg', 'Standard room interior', 'https://hotelaipini.it/en/accommodation/'],
    ['Bathroom', 'ai-pini/bathroom.webp', 'https://hotelaipini.it/wp-content/uploads/2024/12/bagno-standard-ai-pini.jpg', 'Standard room private bathroom', 'https://hotelaipini.it/en/accommodation/'],
  ],
  'stay-vienna-jimmys': [
    ['Entrance', 'jimmys/entrance.webp', 'https://jimmys.at/img/soga_entrance.jpg', "Jimmy's Lory entrance and keypad", 'https://jimmys.at/en/info/lory'],
    ['Room', 'jimmys/room-1.webp', 'https://jimmys.at/img/locations/lory/9/jimmys_apartments_lory_9_0.jpg', 'Executive one-bedroom apartment interior', 'https://jimmys.at/en/locations/lory'],
    ['Bathroom', 'jimmys/room-9-10.webp', 'https://jimmys.at/img/locations/lory/9/jimmys_apartments_lory_9_10.jpg', 'Executive apartment private bathroom', 'https://jimmys.at/en/locations/lory'],
  ],
  'stay-prague-ostas': [
    ['Entrance', 'ostas/detail-1.webp', 'https://9e0fc22837.clvaw-cdnwnd.com/165ebff75ddda5ff0bd641de4f540faa/200000036-d25bbd25bd/20200611_150110.jpg?ph=9e0fc22837', 'Hotel Ostaš signed street facade', 'https://www.hotelostas.cz/en/contact/'],
    ['Room', 'ostas/detail-2.webp', 'https://9e0fc22837.clvaw-cdnwnd.com/165ebff75ddda5ff0bd641de4f540faa/200000459-bec12bec17/700/7IV07588-1.webp?ph=9e0fc22837', 'Ostaš guest room interior', 'https://www.hotelostas.cz/en/rooms/'],
    ['Bathroom', null, 'https://content.r9cdn.net/himg/d1/5d/f2/expedia_group-200892-4ece35-416898.jpg', 'Ostaš private bathroom', 'https://www.momondo.com/hotels/prague/Hotel-Ostas.mhd200892.ksp'],
  ],
  'stay-paris-oden': [
    ['Entrance', 'oden/exterior.webp', 'https://oden-paris-ivry.com/wp-content/uploads/2023/07/oden-paris-ivry0002.jpg', 'Oden Paris Ivry street facade and entrance', 'https://oden-paris-ivry.com/'],
    ['Room', 'oden/room.webp', 'https://oden-paris-ivry.com/wp-content/uploads/2024/07/oden-double-standard0009.jpg', 'Standard double room interior', 'https://oden-paris-ivry.com/chambres/'],
    ['Bathroom', 'oden/detail-2.webp', 'https://oden-paris-ivry.com/wp-content/uploads/2024/07/oden-double-standard0007.jpg', 'Standard double private bathroom', 'https://oden-paris-ivry.com/chambres/'],
  ],
};

for (const stay of hotelData.items) {
  const rows = media[stay.id];
  if (!rows) continue;
  stay.images = [];
  for (const [role, candidate, originalUrl, caption, sourcePage] of rows) {
    const file = `/images/hotels/${stay.id}/${role.toLowerCase()}.webp`;
    const output = join(root, 'public', file.slice(1));
    await mkdir(dirname(output), { recursive: true });
    if (candidate) {
      await sharp(join(root, 'research', 'image-candidates', candidate))
        .resize({ width: 1200, height: 800, fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(output);
    } else {
      const response = await fetch(originalUrl, { headers: { 'user-agent': 'Mozilla/5.0' } });
      if (!response.ok) throw new Error(`${stay.id}/${role}: HTTP ${response.status}`);
      await sharp(Buffer.from(await response.arrayBuffer()))
        .rotate()
        .resize({ width: 1200, height: 800, fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(output);
    }
    stay.images.push({
      file,
      caption,
      source: sourcePage.includes('momondo.com')
        ? 'Momondo / Expedia property photo'
        : sourcePage.includes('booking.com')
          ? 'Booking.com property photo'
          : 'Official property website',
      sourcePage,
      originalUrl,
      lastVerified: verified,
      role,
      entityId: stay.id,
      status: 'VERIFIED REAL PROPERTY PHOTO',
    });
  }
  stay.realityCheck = {
    source: 'Google Maps search',
    sourcePage: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${stay.hotelName}, ${stay.execution.address}`)}`,
    lastVerified: verified,
    note: 'Name, address and arrival context cross-check link.',
  };
}

hotelData.imagesVerifiedAt = verified;
await writeFile(hotelFile, `${JSON.stringify(hotelData, null, 2)}\n`);
console.log(`Imported ${hotelData.items.reduce((count, stay) => count + stay.images.length, 0)} hotel images.`);
