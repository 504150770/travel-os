import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const verified = '2026-09-10';
const restaurantsPath = join(root, 'data', 'restaurants.json');
const gymsPath = join(root, 'data', 'gyms.json');
const coverage = JSON.parse(await readFile(join(root, 'audit', 'asset-coverage.json'), 'utf8'));
const restaurants = JSON.parse(await readFile(restaurantsPath, 'utf8'));
const gyms = JSON.parse(await readFile(gymsPath, 'utf8'));
const failures = [];

const absolute = (value, base) => {
  try {
    return new URL(String(value).replaceAll('&amp;', '&').replace(/^\/\//, 'https://'), base).href;
  } catch {
    return null;
  }
};

const pageCandidates = (html, base) => {
  const candidates = [];
  for (const match of html.matchAll(/<(?:img|source)\b([^>]+)>/gi)) {
    const attrs = match[1];
    const alt = attrs.match(/\b(?:alt|title)=["']([^"']*)/i)?.[1] ?? '';
    const direct = attrs.match(/\b(?:data-src|data-lazy-src|data-original|src)=["']([^"']+)/i)?.[1];
    if (direct) candidates.push({ url: absolute(direct, base), context: alt });
    const srcset = attrs.match(/\bsrcset=["']([^"']+)/i)?.[1];
    if (srcset) {
      const values = srcset.split(',').map((part) => part.trim().split(/\s+/));
      const best = values.at(-1)?.[0];
      if (best) candidates.push({ url: absolute(best, base), context: alt });
    }
  }
  for (const match of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]+content=["']([^"']+)/gi)) {
    candidates.push({ url: absolute(match[1], base), context: 'page hero' });
  }
  for (const match of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["']/gi)) {
    candidates.push({ url: absolute(match[1], base), context: 'page hero' });
  }
  for (const match of html.matchAll(/(?:background-image\s*:\s*url\(|data-bg=["'])([^)'"\s]+)/gi)) {
    candidates.push({ url: absolute(match[1].replace(/["']/g, ''), base), context: 'page background' });
  }
  const seen = new Set();
  return candidates.filter(({ url }) => {
    if (!url || seen.has(url) || /logo|icon|favicon|sprite|avatar|placeholder|tracking|pixel|\.svg(?:\?|$)|\.gif(?:\?|$)/i.test(url)) return false;
    seen.add(url);
    return true;
  });
};

const relatedPages = (html, base) => {
  const origin = new URL(base).origin;
  const links = [];
  for (const match of html.matchAll(/<a\b[^>]+href=["']([^"'#]+)/gi)) {
    const url = absolute(match[1], base);
    if (!url || new URL(url).origin !== origin) continue;
    if (!/menu|food|dish|cucin|restaurant|ristor|gallery|photo|about|story|chambre|room|studio|club|training|fitness/i.test(url)) continue;
    links.push(url);
  }
  return [...new Set(links)].slice(0, 4);
};

const fingerprint = async (bytes) => {
  const { data } = await sharp(bytes).rotate().resize(16, 16, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const sorted = [...data].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return [...data].map((value) => value >= median ? '1' : '0').join('');
};
const distance = (left, right) => [...left].reduce((sum, bit, index) => sum + Number(bit !== right[index]), 0);

const fetchPage = async (url) => {
  const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Travel OS gallery verification)' } });
  if (!response.ok) throw new Error(`page HTTP ${response.status}`);
  return { url: response.url || url, html: await response.text() };
};

const fetchCandidate = async ({ url, context, sourcePage }) => {
  const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0', referer: sourcePage } });
  if (!response.ok || !(response.headers.get('content-type') ?? '').startsWith('image/')) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 18_000 || bytes.length > 18_000_000) return null;
  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 640 || metadata.height < 360) return null;
  const ratio = metadata.width / metadata.height;
  if (ratio < 0.65 || ratio > 2.8) return null;
  return { bytes, url: response.url || url, context, sourcePage, fingerprint: await fingerprint(bytes) };
};

const inferRole = (text, kind) => {
  const value = text.toLowerCase();
  if (/entrance|exterior|facade|front|outside|esterno|ingresso|aussen/.test(value)) return 'entrance';
  if (/interior|inside|sala|dining|room|ambiente|innen|studio/.test(value)) return 'interior';
  if (kind === 'gym' && /weight|strength|machine|rack|smith|training|equipment|fitness|gym/.test(value)) return 'equipment';
  if (kind === 'food' && /dish|food|plate|pasta|pizza|cake|pastr|bread|coffee|chocolate|gelato|menu|cucin|torte|breakfast|sandwich|meat|fish/.test(value)) return 'dish';
  return 'detail';
};

const expand = async (item, kind, target) => {
  const existingSources = Array.isArray(item.imageSources) ? item.imageSources : [];
  const legacy = kind === 'food'
    ? [item.dishImage, item.restaurantImage, item.environmentImage].filter(Boolean)
    : [item.image].filter(Boolean);
  const existing = Array.isArray(item.images) && item.images.length
    ? item.images
    : legacy.map((file, index) => {
        const meta = existingSources.find((source) => source.file === file) ?? {};
        return {
          file,
          role: String(meta.role || (kind === 'gym' ? 'equipment' : 'detail')).toLowerCase(),
          title: meta.caption || item.name,
          caption: meta.caption || `${item.name} real-world visual`,
          source: meta.source || 'Source recorded on entity',
          sourcePage: meta.sourcePage || item.source,
          lastVerified: meta.lastVerified || item.lastVerified || item.verifiedAt || verified,
          isCover: index === 0,
          priority: index + 1,
          entityId: item.id,
        };
      });
  const fingerprints = [];
  for (const image of existing) {
    if (!image.file?.startsWith('/')) continue;
    try {
      fingerprints.push(await fingerprint(await readFile(join(root, 'public', image.file.slice(1)))));
    } catch {}
  }
  const seedPages = [...new Set([item.source, ...existingSources.map((source) => source.sourcePage)].filter((url) => typeof url === 'string' && url.startsWith('http')))];
  const pages = [];
  for (const seed of seedPages) {
    try {
      const page = await fetchPage(seed);
      pages.push(page);
      for (const link of relatedPages(page.html, page.url)) {
        if (pages.some((row) => row.url === link) || pages.length >= 6) continue;
        try { pages.push(await fetchPage(link)); } catch {}
      }
    } catch (error) {
      failures.push({ id: item.id, page: seed, reason: error.message });
    }
  }
  const rawCandidates = pages.flatMap((page) => pageCandidates(page.html, page.url).map((candidate) => ({ ...candidate, sourcePage: page.url })));
  const seenUrls = new Set(existingSources.map((source) => source.originalUrl).filter(Boolean));
  let number = existing.length + 1;
  for (const candidate of rawCandidates) {
    if (existing.length >= target || seenUrls.has(candidate.url)) continue;
    seenUrls.add(candidate.url);
    try {
      const downloaded = await fetchCandidate(candidate);
      if (!downloaded || fingerprints.some((known) => distance(known, downloaded.fingerprint) < 13)) continue;
      fingerprints.push(downloaded.fingerprint);
      const file = `/images/${kind}/${item.id}/${String(number).padStart(2, '0')}.webp`;
      const output = join(root, 'public', file.slice(1));
      await mkdir(dirname(output), { recursive: true });
      await sharp(downloaded.bytes).rotate().resize({ width: 1100, height: 733, fit: 'cover', withoutEnlargement: true }).webp({ quality: 78 }).toFile(output);
      const role = inferRole(`${downloaded.context} ${downloaded.url}`, kind);
      existing.push({
        file,
        role,
        title: downloaded.context || `${item.name} ${role}`,
        caption: `${item.name} · ${downloaded.context || role}`,
        source: 'Official business website',
        sourcePage: downloaded.sourcePage,
        originalUrl: downloaded.url,
        lastVerified: verified,
        isCover: false,
        priority: number,
        entityId: item.id,
      });
      number += 1;
    } catch {}
  }
  item.images = existing;
  return existing.length;
};

const foodIds = new Set(coverage.topFood.ids);
for (const item of restaurants.filter((row) => foodIds.has(row.id))) {
  const count = await expand(item, 'food', 5);
  console.log(`FOOD ${item.id}: ${count}`);
}
const gymIds = new Set(coverage.topGym.ids);
for (const item of gyms.filter((row) => gymIds.has(row.id))) {
  const count = await expand(item, 'gym', 3);
  console.log(`GYM ${item.id}: ${count}`);
}

await writeFile(restaurantsPath, `${JSON.stringify(restaurants, null, 2)}\n`);
await writeFile(gymsPath, `${JSON.stringify(gyms, null, 2)}\n`);
await writeFile(join(root, 'audit', 'gallery-import-failures.json'), `${JSON.stringify(failures, null, 2)}\n`);
