import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const verified = '2026-09-10';
const load = async (file) => JSON.parse(await readFile(join(root, file), 'utf8'));
const [images, gyms, restaurants, hotels] = await Promise.all([
  load('data/images.json'), load('data/gyms.json'), load('data/restaurants.json'), load('data/hotel-bookings.json'),
]);
const saveWebp = async (input, file) => {
  const output = join(root, 'public', file.slice(1));
  await mkdir(dirname(output), { recursive: true });
  await sharp(input).rotate().resize({ width: 1200, height: 800, fit: 'cover', withoutEnlargement: true }).webp({ quality: 79 }).toFile(output);
};
const download = async (url, file, referer) => {
  const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 TravelOSGallery/1.0', ...(referer ? { referer } : {}) } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  await saveWebp(Buffer.from(await response.arrayBuffer()), file);
};

const replaceGym = async (id, index, url, role, title, sourcePage, source) => {
  const item = gyms.find((row) => row.id === id);
  const file = item.images[index].file;
  await download(url, file, sourcePage);
  item.images[index] = { file, role, title, caption: `${item.name} · ${title}`, source, sourcePage, originalUrl: url, lastVerified: verified, isCover: false, priority: index + 1, entityId: id };
};
await replaceGym(
  'gym-vienna-jh', 2,
  'https://www.johnharris.at/xstorage/1/_cache/20220614/(c)-Tim-Walker-2073_218_1_264a7a75df7b1d50efc13c3a5e6768a7.webp',
  'interior', 'Schillerplatz training floor', 'https://www.johnharris.at/en/studios/detail/1/schillerplatz.html', 'Official business website',
);
await replaceGym(
  'gym-paris-fpark', 2,
  'https://datas.masalledesport.com/prod/place/12111/galerie/1636732696186.jpg',
  'equipment', 'Strength equipment zone', 'https://www.masalledesport.com/salle/12111%2Cfitness-park-paris-porte-de-choisy%2Cclub-de-fitness%2Cparis%2C75013%2Cfr', 'Ma Salle de Sport venue gallery',
);

const forno = restaurants.find((item) => item.id === 'rome-forno');
forno.images = forno.images.filter((image) => !image.file.endsWith('/03.webp') && !image.file.endsWith('/04.webp'));
forno.images.push({
  file: '/images/food/rome-forno/04.webp', role: 'dish', title: 'Bread, pizza and pastry counter',
  caption: 'Forno Campo de’ Fiori · bread, pizza and pastry counter', source: 'Condé Nast Traveler',
  sourcePage: 'https://www.cntraveler.com/restaurants/rome/forno-campo-de-fiori',
  originalUrl: 'https://media.cntraveler.com/photos/5dfbe7bcaa106c0008d8ba77/16:9/w_2560%2Cc_limit/FORNOCAMPODEIFIORIIMG_13382019-SabrinaRossi-Rome.jpg',
  lastVerified: verified, isCover: true, priority: 1, entityId: forno.id,
});
const fornoWindow = forno.images.find((image) => image.file.endsWith('/05.webp'));
if (fornoWindow) { fornoWindow.role = 'dish'; fornoWindow.title = 'Seasonal pastry window'; fornoWindow.caption = 'Forno Campo de’ Fiori · seasonal pastry window'; }
for (const image of forno.images) if (image.file !== '/images/food/rome-forno/04.webp') image.isCover = false;
forno.images = forno.images.sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.priority - b.priority).map((image, index) => ({ ...image, priority: index + 1 }));
forno.imageSources = forno.images;
forno.dishImage = '/images/food/rome-forno/04.webp';
forno.restaurantImage = '/images/food/rome-forno/04.webp';

const jimmy = hotels.items.find((item) => item.id === 'stay-vienna-jimmys');
const jimmyInterior = jimmy.images.find((image) => image.file.endsWith('/interior-5.webp'));
await saveWebp(join(root, 'research', 'image-candidates', 'jimmys', 'room-2.webp'), jimmyInterior.file);
Object.assign(jimmyInterior, {
  role: 'interior', title: 'Alternative apartment living area', caption: 'Executive apartment living area from a second angle',
  source: 'Official property website', sourcePage: 'https://jimmys.at/en/locations/lory',
  originalUrl: 'https://jimmys.at/img/locations/lory/9/jimmys_apartments_lory_9_1.jpg', lastVerified: verified,
});

const commonsReplacement = async (id, targetId, query) => {
  const current = images.filter((image) => image.id !== targetId);
  const usedPages = new Set(current.map((image) => image.sourcePage).filter(Boolean));
  const hashes = [];
  for (const image of current) {
    const pixels = await sharp(join(root, 'public', image.file.slice(1))).resize(9, 8, { fit: 'fill' }).greyscale().raw().toBuffer();
    hashes.push([...Array(64)].map((_, n) => pixels[Math.floor(n / 8) * 9 + n % 8] > pixels[Math.floor(n / 8) * 9 + n % 8 + 1] ? '1' : '0').join(''));
  }
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.search = new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrnamespace: '6', gsrlimit: '30', gsrsearch: query, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1800' });
  const payload = await fetch(api, { headers: { 'user-agent': 'TravelOSGallery/1.0' } }).then((response) => response.json());
  for (const page of Object.values(payload.query?.pages || {})) {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl || usedPages.has(info.descriptionurl) || /map|logo|icon|plan|diagram|poster/i.test(page.title)) continue;
    const response = await fetch(info.thumburl, { headers: { 'user-agent': 'TravelOSGallery/1.0' } });
    if (!response.ok) continue;
    const bytes = Buffer.from(await response.arrayBuffer());
    let pixels;
    try { pixels = await sharp(bytes).resize(9, 8, { fit: 'fill' }).greyscale().raw().toBuffer(); } catch { continue; }
    const hash = [...Array(64)].map((_, n) => pixels[Math.floor(n / 8) * 9 + n % 8] > pixels[Math.floor(n / 8) * 9 + n % 8 + 1] ? '1' : '0').join('');
    const distance = (a, b) => [...a].reduce((sum, bit, index) => sum + Number(bit !== b[index]), 0);
    if (hashes.some((existing) => distance(existing, hash) <= 4)) continue;
    const row = images.find((image) => image.id === targetId);
    await saveWebp(bytes, row.file);
    const metadata = info.extmetadata || {};
    const clean = (value) => String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    Object.assign(row, {
      title: clean(metadata.ImageDescription?.value || metadata.ObjectName?.value || page.title.replace(/^File:/, '')),
      caption: clean(metadata.ImageDescription?.value || metadata.ObjectName?.value || page.title.replace(/^File:/, '')),
      source: `Wikimedia Commons · ${clean(metadata.LicenseShortName?.value || 'licensed media')}`,
      sourcePage: info.descriptionurl, originalUrl: info.url, credit: clean(metadata.Artist?.value || ''), lastVerified: verified,
    });
    return;
  }
  throw new Error(`No unique Commons replacement for ${id}`);
};
await commonsReplacement('colosseum', 'gallery-colosseum-3', 'Colosseum Rome exterior');
await commonsReplacement('st_vitus', 'gallery-st_vitus-2', 'Saint Vitus Cathedral Prague exterior');

await Promise.all([
  writeFile(join(root, 'data/images.json'), `${JSON.stringify(images, null, 2)}\n`),
  writeFile(join(root, 'data/gyms.json'), `${JSON.stringify(gyms, null, 2)}\n`),
  writeFile(join(root, 'data/restaurants.json'), `${JSON.stringify(restaurants, null, 2)}\n`),
  writeFile(join(root, 'data/hotel-bookings.json'), `${JSON.stringify(hotels, null, 2)}\n`),
]);
console.log('Resolved known exact and perceptual gallery duplicates.');
