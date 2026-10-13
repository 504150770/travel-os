import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Build output only: include lazy UI code without downloading the media library
// or initializing maps. The existing Vercel adapter already serves this folder.
export function generateOfflineAppManifest(clientRoot, shellAssets = []) {
  const staticRoot = join(clientRoot, '_next', 'static');
  const files = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile() && /\.(?:js|css|woff2?|png|jpe?g|webp|svg)$/i.test(entry.name)) files.push(file);
    }
  };
  visit(staticRoot);
  files.sort((a, b) => a.localeCompare(b));
  if (!files.some((file) => file.endsWith('.js'))) throw new Error('Missing built application code');
  const hash = createHash('sha256');
  let totalBytes = 0;
  const assets = files.map((file) => {
    const url = `/${relative(clientRoot, file).replaceAll('\\', '/')}`;
    const bytes = readFileSync(file);
    hash.update(url).update(bytes);
    totalBytes += bytes.length;
    return url;
  });
  for (const url of shellAssets) {
    if (!url.startsWith('/images/') || url.includes('..')) throw new Error('Invalid shell image path');
    const bytes = readFileSync(join(clientRoot, url.slice(1)));
    assets.push(url);
    hash.update(url).update(bytes);
    totalBytes += bytes.length;
  }
  const entryFile = join(clientRoot, 'vinext-client-entry-manifest.json');
  let entry;
  if (existsSync(entryFile)) {
    const bytes = readFileSync(entryFile);
    entry = `/${JSON.parse(bytes).appBrowserEntry}`;
    if (!assets.includes(entry)) throw new Error('Built application entry is missing from offline assets');
    hash.update('vinext-client-entry-manifest.json').update(bytes);
  }
  assets.unshift('/', '/_next/static/offline-app.json');
  const manifest = { version: hash.digest('hex').slice(0, 12), assetCount: assets.length, totalBytes, assets, ...(entry ? { entry } : {}) };
  writeFileSync(join(staticRoot, 'offline-app.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = generateOfflineAppManifest(resolve('dist/client'), ['/images/home-eiffel-winter-sunset-lossless.webp']);
  console.log(`Offline app manifest: ${manifest.assetCount} assets, ${manifest.totalBytes} bytes, ${manifest.version}`);
}
