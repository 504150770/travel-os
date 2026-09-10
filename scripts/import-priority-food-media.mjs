import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const verified = '2026-09-10';
const restaurantFile = join(root, 'data', 'restaurants.json');
const restaurants = JSON.parse(await readFile(restaurantFile, 'utf8'));
const coverage = JSON.parse(await readFile(join(root, 'audit', 'asset-coverage.json'), 'utf8'));
const priorityIds = new Set(coverage.topFood.ids);
const failures = [];

const absolute = (value, base) => {
  try {
    const normalized = value.replaceAll('&amp;', '&').replace(/^\/\//, 'https://');
    return new URL(normalized, base).href;
  } catch {
    return null;
  }
};

const candidatesFrom = (html, base) => {
  const values = [];
  const metaPatterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)/gi,
  ];
  for (const pattern of metaPatterns) for (const match of html.matchAll(pattern)) values.push(match[1]);
  for (const match of html.matchAll(/<(?:img|source)[^>]+(?:data-src|data-lazy-src|src)=["']([^"']+)/gi)) values.push(match[1]);
  for (const match of html.matchAll(/<(?:img|source)[^>]+srcset=["']([^"']+)/gi)) {
    for (const part of match[1].split(',')) values.push(part.trim().split(/\s+/)[0]);
  }
  return [...new Set(values.map((value) => absolute(value, base)).filter(Boolean))]
    .filter((url) => !/logo|icon|favicon|sprite|avatar|placeholder|tracking|pixel|\.svg(?:\?|$)|\.gif(?:\?|$)/i.test(url));
};

const importOne = async (item) => {
  try {
    const response = await fetch(item.source, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Travel OS media audit)' } });
    if (!response.ok) throw new Error(`page HTTP ${response.status}`);
    const finalPage = response.url || item.source;
    const html = await response.text();
    const candidates = candidatesFrom(html, finalPage).slice(0, 24);
    let chosen;
    for (const url of candidates) {
      try {
        const imageResponse = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0', referer: finalPage } });
        if (!imageResponse.ok) continue;
        const contentType = imageResponse.headers.get('content-type') ?? '';
        if (!contentType.startsWith('image/')) continue;
        const bytes = Buffer.from(await imageResponse.arrayBuffer());
        if (bytes.length < 20_000 || bytes.length > 15_000_000) continue;
        const metadata = await sharp(bytes).metadata();
        if (!metadata.width || !metadata.height || metadata.width < 600 || metadata.height < 360) continue;
        const ratio = metadata.width / metadata.height;
        if (ratio < 0.65 || ratio > 2.8) continue;
        chosen = { bytes, url };
        break;
      } catch {
        // Try the next traceable image candidate.
      }
    }
    if (!chosen) throw new Error('no suitable official image candidate');
    const file = `/images/food/${item.id}.webp`;
    const output = join(root, 'public', file.slice(1));
    await mkdir(dirname(output), { recursive: true });
    await sharp(chosen.bytes).rotate().resize({ width: 960, height: 640, fit: 'cover', withoutEnlargement: true }).webp({ quality: 80 }).toFile(output);
    item.restaurantImage = file;
    item.photoStatus = '已核真实来源图片';
    item.imageSources = [{
      file,
      caption: `${item.name} — official venue visual`,
      source: 'Official restaurant website',
      sourcePage: finalPage,
      originalUrl: chosen.url,
      lastVerified: verified,
      role: 'Restaurant',
      entityId: item.id,
    }];
    console.log(`OK ${item.id}`);
  } catch (error) {
    failures.push({ id: item.id, name: item.name, sourcePage: item.source, reason: error.message });
    console.warn(`MISS ${item.id}: ${error.message}`);
  }
};

const queue = restaurants.filter((item) => priorityIds.has(item.id));
for (let index = 0; index < queue.length; index += 4) {
  await Promise.all(queue.slice(index, index + 4).map(importOne));
}

await writeFile(restaurantFile, `${JSON.stringify(restaurants, null, 2)}\n`);
await writeFile(join(root, 'audit', 'priority-food-media-failures.json'), `${JSON.stringify(failures, null, 2)}\n`);
console.log(`Imported ${queue.length - failures.length}/${queue.length}; failures ${failures.length}.`);
