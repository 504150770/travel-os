import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  desktopViewForMobile,
  desktopViewFromUrl,
  mobileViewFromUrl,
} from '../features/mobile/mobileModel.ts';
import { routeCoordinateOrder } from '../features/map/mapModel.ts';

assert.equal(mobileViewFromUrl('trip'), 'today');
assert.equal(mobileViewFromUrl('home'), 'today');
assert.equal(mobileViewFromUrl('today'), 'today');
assert.equal(mobileViewFromUrl('map'), 'map');
assert.equal(mobileViewFromUrl('discover'), 'explore');
assert.equal(mobileViewFromUrl('explore'), 'explore');
assert.equal(desktopViewFromUrl('today'), 'trip');
assert.equal(desktopViewFromUrl('map'), 'trip');
assert.equal(desktopViewFromUrl('explore'), 'discover');
assert.equal(desktopViewForMobile('map'), 'trip');

const route = {
  legs: [
    { fromId: 'hotel', toId: 'a' },
    { fromId: 'a', toId: 'b' },
    { fromId: 'b', toId: 'hotel' },
  ],
};
const points = [
  { id: 'hotel', lat: 1, lng: 2 },
  { id: 'a', lat: 3, lng: 4 },
  { id: 'b', lat: 5, lng: 6 },
];
assert.deepEqual(routeCoordinateOrder(route, points), [
  [1, 2],
  [3, 4],
  [5, 6],
  [1, 2],
]);

const root = process.cwd();
const shell = fs.readFileSync(path.join(root, 'components/shell/MobileShell.tsx'), 'utf8');
const mapScreen = fs.readFileSync(
  path.join(root, 'components/mobile/MobileMapScreen.tsx'),
  'utf8',
);
const tripWorkspace = fs.readFileSync(
  path.join(root, 'components/mobile/MobileTripWorkspace.tsx'),
  'utf8',
);
const mobileCss = fs.readFileSync(
  path.join(root, 'components/mobile/mobile.css'),
  'utf8',
);
const mobileSelectors = fs.readFileSync(
  path.join(root, 'features/mobile/mobileTripSelectors.ts'),
  'utf8',
);
for (const label of ['Today', 'Map', 'Explore', 'Plan', 'More']) {
  assert.match(shell, new RegExp(`label: '${label}'`));
}
assert.match(mapScreen, /import MobileMapCanvas from '@\/components\/mobile\/map\/MobileMapCanvas'/);
assert.match(tripWorkspace, /import\('@\/components\/mobile\/MobileMapScreen'\)/);
assert.match(tripWorkspace, /mapVisited/);
assert.doesNotMatch(mobileSelectors, /food: food|gyms:/);
assert.match(mapScreen, /mobile-map-progress/);
assert.match(mobileCss, /env\(safe-area-inset-top\)/);
assert.match(mobileCss, /env\(safe-area-inset-bottom\)/);

const nonMapMobileFiles = fs
  .readdirSync(path.join(root, 'components/mobile'), { recursive: true })
  .filter((file) => typeof file === 'string' && /\.(?:ts|tsx)$/.test(file))
  .filter((file) => !file.replaceAll('\\', '/').startsWith('map/'));
for (const file of nonMapMobileFiles) {
  const source = fs.readFileSync(path.join(root, 'components/mobile', file), 'utf8');
  assert.doesNotMatch(source, /from ['"]leaflet['"]/);
}

console.log(
  'Mobile shell tests passed: URL aliases, shared day mapping, route order, five-tab dock, safe areas, and lazy Leaflet boundary.',
);
