import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const source = readFileSync(join(root, 'components/media-gallery.tsx'), 'utf8');
assert.match(source, /\.showModal\(\)/, 'Gallery must enter the native modal top layer');
assert.match(source, /onCancel=/, 'Gallery must handle native Escape/cancel');
assert.match(source, /triggerRef\.current\?\.focus/, 'Gallery must restore trigger focus');
assert.doesNotMatch(source, /className="media-gallery"\s+open/, 'Gallery must not use the open attribute directly');
assert.match(source, /ArrowLeft/); assert.match(source, /ArrowRight/); assert.match(source, /onTouchEnd/);

const manifest = JSON.parse(readFileSync(join(root, 'public/offline-core.json'), 'utf8'));
assert.ok(manifest.assetCount < 292, 'Offline core must not cache the entire media library');
assert.equal(manifest.assets.length, manifest.assetCount);
for (const asset of manifest.assets.filter((item) => item.startsWith('/images/'))) assert.ok(existsSync(join(root, 'public', asset.slice(1))), `Missing offline asset ${asset}`);
const report = JSON.parse(readFileSync(join(root, 'audit/offline-core.json'), 'utf8'));
assert.equal(report.passed, true, 'Offline core entity coverage must pass');
const sw = readFileSync(join(root, 'public/sw.js'), 'utf8');
assert.match(sw, /DOWNLOAD_OFFLINE_PACK/); assert.match(sw, /OFFLINE_PREFIX/); assert.match(sw, /cache\.match/);
console.log(`Gallery modal and ${manifest.assetCount}-asset offline core tests passed.`);
