import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const candidates = [
  ['colonna/exterior', 'https://www.hotelcolonnapalace.com/images/home-banner-1.jpg'],
  ['colonna/room', 'https://www.hotelcolonnapalace.com/images/room-6.jpg'],
  ['colonna/detail-1', 'https://www.hotelcolonnapalace.com/images/room-6-1.jpg'],
  ['colonna/detail-2', 'https://www.hotelcolonnapalace.com/images/room-6-2.jpg'],
  ['colonna/detail-3', 'https://www.hotelcolonnapalace.com/images/room-6-3.jpg'],
  ['fonderia/exterior', 'https://www.fonderiafirenze.com/images/about/fonderiafirenze-location-1.jpg'],
  ['fonderia/room', 'https://www.fonderiafirenze.com/images/rooms/piombo/gallery/fonderiafirenze-camera-piombo-10.jpg'],
  ['fonderia/detail-1', 'https://www.fonderiafirenze.com/images/rooms/piombo/gallery/fonderiafirenze-camera-piombo-14.jpg'],
  ['fonderia/detail-2', 'https://www.fonderiafirenze.com/images/rooms/piombo/gallery/fonderiafirenze-camera-piombo-16.jpg'],
  ['fonderia/detail-3', 'https://www.fonderiafirenze.com/images/rooms/piombo/gallery/fonderiafirenze-camera-piombo-18.jpg'],
  ['ai-pini/exterior', 'https://hotelaipini.it/wp-content/uploads/2024/12/ai-pini.jpg'],
  ['ai-pini/room', 'https://hotelaipini.it/wp-content/uploads/2024/12/camera.jpg'],
  ['ai-pini/room-standard', 'https://hotelaipini.it/wp-content/uploads/2024/12/camera-standard-ai-pini.jpg'],
  ['ai-pini/bathroom', 'https://hotelaipini.it/wp-content/uploads/2024/12/bagno-standard-ai-pini.jpg'],
  ['jimmys/entrance', 'https://jimmys.at/img/soga_entrance.jpg'],
  ['jimmys/room-1', 'https://jimmys.at/img/locations/lory/9/jimmys_apartments_lory_9_0.jpg'],
  ['jimmys/room-2', 'https://jimmys.at/img/locations/lory/9/jimmys_apartments_lory_9_1.jpg'],
  ['jimmys/detail-1', 'https://jimmys.at/img/locations/lory/9/jimmys_apartments_lory_9_2.jpg'],
  ['jimmys/detail-2', 'https://jimmys.at/img/locations/lory/9/jimmys_apartments_lory_9_3.jpg'],
  ['jimmys/detail-3', 'https://jimmys.at/img/locations/lory/9/jimmys_apartments_lory_9_4.jpg'],
  ['ostas/exterior-1', 'https://9e0fc22837.clvaw-cdnwnd.com/165ebff75ddda5ff0bd641de4f540faa/200000021-211b2211b4/20200611_150709.jpg?ph=9e0fc22837'],
  ['ostas/exterior-2', 'https://9e0fc22837.clvaw-cdnwnd.com/165ebff75ddda5ff0bd641de4f540faa/200000035-a1aaba1aad/20200611_150017.jpg?ph=9e0fc22837'],
  ['ostas/detail-1', 'https://9e0fc22837.clvaw-cdnwnd.com/165ebff75ddda5ff0bd641de4f540faa/200000036-d25bbd25bd/20200611_150110.jpg?ph=9e0fc22837'],
  ['ostas/room', 'https://9e0fc22837.clvaw-cdnwnd.com/165ebff75ddda5ff0bd641de4f540faa/200000213-75fbe75fc0/700/20200611_144137-52.jpg?ph=9e0fc22837'],
  ['ostas/detail-2', 'https://9e0fc22837.clvaw-cdnwnd.com/165ebff75ddda5ff0bd641de4f540faa/200000459-bec12bec17/700/7IV07588-1.webp?ph=9e0fc22837'],
  ['oden/exterior', 'https://oden-paris-ivry.com/wp-content/uploads/2023/07/oden-paris-ivry0002.jpg'],
  ['oden/room', 'https://oden-paris-ivry.com/wp-content/uploads/2024/07/oden-double-standard0009.jpg'],
  ['oden/detail-1', 'https://oden-paris-ivry.com/wp-content/uploads/2024/07/oden-double-standard0008.jpg'],
  ['oden/detail-2', 'https://oden-paris-ivry.com/wp-content/uploads/2024/07/oden-double-standard0007.jpg'],
  ['oden/detail-3', 'https://oden-paris-ivry.com/wp-content/uploads/2024/07/oden-deluxe0005.jpg'],
];

for (const room of [1, 2, 4, 5, 7, 8, 9, 10, 11]) {
  for (const detail of ['', '-1', '-2', '-3', '-4']) {
    candidates.push([
      `colonna/room-${room}${detail}`,
      `https://www.hotelcolonnapalace.com/images/room-${room}${detail}.jpg`,
    ]);
  }
}
for (let index = 5; index <= 11; index += 1) {
  candidates.push([
    `jimmys/room-9-${index}`,
    `https://jimmys.at/img/locations/lory/9/jimmys_apartments_lory_9_${index}.jpg`,
  ]);
}
candidates.push([
  'ostas/bathroom-candidate',
  'https://9e0fc22837.clvaw-cdnwnd.com/165ebff75ddda5ff0bd641de4f540faa/200000212-5d4b35d4b5/700/20200611_144843-8.jpg?ph=9e0fc22837',
]);
for (const [name, url] of [
  ['ostas/gallery-3', 'https://9e0fc22837.clvaw-cdnwnd.com/165ebff75ddda5ff0bd641de4f540faa/200000460-640a2640a5/7IV07566-3.jpg?ph=9e0fc22837'],
  ['ostas/gallery-4', 'https://9e0fc22837.clvaw-cdnwnd.com/165ebff75ddda5ff0bd641de4f540faa/200000462-045a6045a9/7IV07568-1.jpg?ph=9e0fc22837'],
  ['ostas/gallery-5', 'https://9e0fc22837.clvaw-cdnwnd.com/165ebff75ddda5ff0bd641de4f540faa/200000464-e4c69e4c6c/7IV07570.jpg?ph=9e0fc22837'],
  ['ostas/gallery-6', 'https://9e0fc22837.clvaw-cdnwnd.com/165ebff75ddda5ff0bd641de4f540faa/200000466-c21d9c21dd/7IV07577.jpg?ph=9e0fc22837'],
]) candidates.push([name, url]);

await Promise.all(candidates.map(async ([name, url]) => {
  try {
  const output = join(root, 'research', 'image-candidates', `${name}.webp`);
  await mkdir(dirname(output), { recursive: true });
  const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!response.ok) {
    console.warn(`SKIP ${name}: ${response.status}`);
    return;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await sharp(bytes).rotate().resize({ width: 900, height: 600, fit: 'cover' }).webp({ quality: 80 }).toFile(output);
  console.log(`OK ${name}`);
  } catch (error) {
    console.warn(`SKIP ${name}: ${error.message}`);
  }
}));

await writeFile(
  join(root, 'research', 'image-candidates', 'sources.json'),
  `${JSON.stringify(Object.fromEntries(candidates), null, 2)}\n`,
);
