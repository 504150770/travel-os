import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const today = '2026-09-29';
const places = [
  {
    id: 'accademia_florence', dayId: 5,
    fileName: "Michelangelo's David, Galleria dell'Accademia, Florence (26651343286).jpg",
    caption: 'Michelangelo’s David in the Accademia Gallery',
    credit: 'Dimitris Kamaras · CC BY 2.0',
    sourcePage: "https://commons.wikimedia.org/wiki/File:Michelangelo's_David,_Galleria_dell'Accademia,_Florence_(26651343286).jpg",
  },
  {
    id: 'doges_palace', dayId: 8,
    fileName: 'Interno della Sala del Maggior Consiglio - Palazzo Ducale, Venezia.JPG',
    caption: 'Doge’s Palace · Great Council Chamber',
    credit: 'Riccardo Lelli · CC BY-SA 3.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Interno_della_Sala_del_Maggior_Consiglio_-_Palazzo_Ducale,_Venezia.JPG',
  },
  {
    id: 'opt-paris-sainte', dayId: 14,
    fileName: 'La-Sainte-Chapelle-interior.jpg',
    caption: 'Sainte-Chapelle · stained-glass interior',
    credit: 'GruntXIII · CC BY-SA 4.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:La-Sainte-Chapelle-interior.jpg',
  },
  {
    id: 'palais_garnier', dayId: 16,
    fileName: 'Le Grand Foyer.jpg',
    caption: 'Palais Garnier · Grand Foyer',
    credit: 'Vinc2Trefle · CC BY-SA 4.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Le_Grand_Foyer.jpg',
  },
];

const imagesPath = join(root, 'data', 'images.json');
const images = JSON.parse(readFileSync(imagesPath, 'utf8'));
for (const place of places) {
  const file = `/images/places/${place.id}/01.webp`;
  const output = join(root, 'public', file.slice(1));
  if (!existsSync(output)) {
    mkdirSync(dirname(output), { recursive: true });
    const url = `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(place.fileName)}?width=1600`;
    const response = await fetch(url, { headers: { 'user-agent': 'PersonalTravelGuide/1.0 (local project)' } });
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    await sharp(Buffer.from(await response.arrayBuffer()))
      .rotate().resize(1600, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 }).toFile(output);
  }
  const id = `gallery-${place.id}-1`;
  const image = {
    id, day: place.dayId, dayId: place.dayId, placeId: place.id, entityId: place.id,
    file, title: place.caption, caption: place.caption, use: 'gallery', role: 'gallery',
    type: 'real-world', timeOfDay: 'any', bestTime: '以当天行程光线为准',
    focalLength: '现场选择', composition: '作为现场识别与空间参考',
    credit: place.credit, source: 'Wikimedia Commons', sourcePage: place.sourcePage,
    lastVerified: today, isCover: true, priority: 1, key: id,
    sourceType: 'Wikimedia Commons licensed media', visuallyReviewed: true,
  };
  const index = images.findIndex((row) => row.id === id);
  if (index >= 0) images[index] = image;
  else images.push(image);
}
writeFileSync(imagesPath, `${JSON.stringify(images, null, 2)}\n`);
console.log(`Imported ${places.length} current-plan place covers.`);
