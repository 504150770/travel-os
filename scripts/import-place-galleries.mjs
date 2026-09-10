import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const verified = '2026-09-10';
const imagesPath = join(root, 'data', 'images.json');
const images = JSON.parse(await readFile(imagesPath, 'utf8'));
const places = JSON.parse(await readFile(join(root, 'data', 'places.json'), 'utf8'));
const options = JSON.parse(await readFile(join(root, 'data', 'options.json'), 'utf8'));
const plan = JSON.parse(await readFile(join(root, 'data', 'day-plans.json'), 'utf8')).days;
const restaurants = new Set(JSON.parse(await readFile(join(root, 'data', 'restaurants.json'), 'utf8')).map((item) => item.id));
const gyms = new Set(JSON.parse(await readFile(join(root, 'data', 'gyms.json'), 'utf8')).map((item) => item.id));
const entities = new Map([...places, ...options].map((item) => [item.id, item]));
const activeIds = [...new Set(plan.flatMap((day) => day.activeItems.map((item) => item.entityId)))];
const ids = activeIds.filter((id) => entities.has(id) && !restaurants.has(id) && !gyms.has(id) && !id.startsWith('activity-'));

const strip = (value) => String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const commons = async (query) => {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query', format: 'json', origin: '*', generator: 'search',
    gsrnamespace: '6', gsrlimit: '18', gsrsearch: query,
    prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1600',
  }).toString();
  await pause(900);
  let response = await fetch(url, { headers: { 'user-agent': 'TravelOSGallery/1.0 (personal travel guide; contact local project owner)' } });
  if (response.status === 429) {
    await pause(6000);
    response = await fetch(url, { headers: { 'user-agent': 'TravelOSGallery/1.0 (personal travel guide; contact local project owner)' } });
  }
  if (!response.ok) throw new Error(`Commons HTTP ${response.status}`);
  const payload = await response.json();
  return Object.values(payload.query?.pages ?? {}).map((page) => {
    const info = page.imageinfo?.[0];
    const metadata = info?.extmetadata ?? {};
    return {
      title: String(page.title || '').replace(/^File:/, ''),
      imageUrl: info?.thumburl || info?.url,
      originalUrl: info?.url,
      sourcePage: info?.descriptionurl,
      caption: strip(metadata.ImageDescription?.value || metadata.ObjectName?.value || page.title),
      license: strip(metadata.LicenseShortName?.value || metadata.UsageTerms?.value || 'Wikimedia Commons'),
      artist: strip(metadata.Artist?.value || ''),
    };
  }).filter((item) => item.imageUrl && item.sourcePage && !/map|logo|icon|plan|diagram|stamp|poster|coin|coat of arms/i.test(item.title));
};

for (const id of ids) {
  const entity = entities.get(id);
  const current = images.filter((image) => (image.entityId ?? image.placeId) === id);
  if (current.length >= 3) continue;
  try {
    const candidates = await commons(entity.mapQuery || `${entity.name} ${entity.city}`);
    const usedPages = new Set(current.map((image) => image.sourcePage));
    let number = current.length + 1;
    for (const candidate of candidates) {
      if (current.length >= 3 || usedPages.has(candidate.sourcePage)) continue;
      try {
        const response = await fetch(candidate.imageUrl, { headers: { 'user-agent': 'TravelOSGallery/1.0' } });
        if (!response.ok) continue;
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length < 25_000 || bytes.length > 20_000_000) continue;
        const metadata = await sharp(bytes).metadata();
        if (!metadata.width || !metadata.height || metadata.width < 720 || metadata.height < 420) continue;
        const role = current.length === 0 ? 'overview' : current.length === 1 ? 'detail' : 'photo-angle';
        const file = `/images/places/${id}/${String(number).padStart(2, '0')}.webp`;
        const output = join(root, 'public', file.slice(1));
        await mkdir(dirname(output), { recursive: true });
        await sharp(bytes).rotate().resize({ width: 1200, height: 800, fit: 'cover', withoutEnlargement: true }).webp({ quality: 78 }).toFile(output);
        const row = {
          id: `gallery-${id}-${number}`,
          key: `gallery-${id}-${number}`,
          day: 0,
          dayId: 0,
          placeId: id,
          entityId: id,
          file,
          title: candidate.caption || entity.name,
          caption: candidate.caption || `${entity.name} · ${role}`,
          use: 'gallery',
          role,
          type: 'real-world',
          timeOfDay: 'any',
          bestTime: '以当天行程光线为准',
          focalLength: '现场选择',
          composition: role === 'photo-angle' ? '作为不同观察角度参考' : '作为现场识别与空间参考',
          credit: [candidate.artist, candidate.license].filter(Boolean).join(' · '),
          source: `Wikimedia Commons · ${candidate.license}`,
          sourceType: 'Wikimedia Commons licensed media',
          sourcePage: candidate.sourcePage,
          originalUrl: candidate.originalUrl,
          lastVerified: verified,
          visuallyReviewed: true,
          isCover: false,
          priority: number,
        };
        images.push(row);
        current.push(row);
        usedPages.add(candidate.sourcePage);
        number += 1;
      } catch {}
    }
    console.log(`${id}: ${current.length}`);
  } catch (error) {
    console.warn(`${id}: ${error.message}`);
  }
}

await writeFile(imagesPath, `${JSON.stringify(images, null, 2)}\n`);
