import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const home = read('views/home/HomeView.tsx');
const shell = read('components/shell/DesktopShell.tsx');
const appShell = read('components/shell/AppShell.tsx');
const tripView = read('views/trip/TripView.tsx');
const workspace = read('views/trip/DesktopTripWorkspace.tsx');
const overview = read('views/trip/DesktopTripOverview.tsx');
const desktopMap = read('views/trip/DesktopTripMap.tsx');
const mapCanvas = read('components/map/MapCanvas.tsx');
const routeGeometry = read('features/map/routing/useRouteGeometry.ts');
const globalCss = read('app/globals.css');
const workspaceCss = read('views/trip/desktop-workspace.css');

// home-visual
assert.match(home, /HOME_HERO = '\/images\/places\/eiffel\/01\.webp'/);
assert.match(home, /guideData\.trip\.cities\.map/);
assert.match(home, /nextAction\?\.title/);
assert.match(home, /projectedBudget/);
assert.match(home, /activeEntityCount/);
assert.doesNotMatch(globalCss, /route-ribbon > div:nth-child/);
assert.match(shell, /view !== 'home' && <header className="v2-topbar">/);
assert.match(appShell, /isMobile && view === 'home'/);

// desktop-view-mode
assert.match(workspace, /useState<'overview' \| 'map'>\('overview'\)/);
assert.match(workspace, /const \[mapOpened, setMapOpened\] = useState\(false\)/);
assert.match(workspace, /aria-label="Workspace view"/);
assert.match(workspace, /mapOpened && <div className="workspace-map-stage"/);
assert.match(workspace, /hidden=\{viewMode !== 'map'\}/);
assert.match(overview, /data-trip-overview/);

// map-lazy-load
assert.doesNotMatch(tripView, /preloadMapCanvas/);
assert.doesNotMatch(workspace, /from 'leaflet'/);
assert.match(desktopMap, /lazy\(loadMapCanvas\)/);
assert.match(mapCanvas, /from 'leaflet'/);
assert.match(mapCanvas, /active= true|active = true/);
assert.match(routeGeometry, /enabled = true/);
assert.match(routeGeometry, /if \(!enabled\) return/);

// overlay-layering
assert.match(globalCss, /--layer-map: 10/);
assert.match(globalCss, /--layer-backdrop: 700/);
assert.match(globalCss, /--layer-drawer: 710/);
assert.match(workspaceCss, /workspace-map[^{]*\{[^}]*isolation: isolate/);
assert.match(workspaceCss, /workspace-drawer-backdrop[^{]*\{[^}]*z-index: var\(--layer-backdrop\)/);
assert.match(workspaceCss, /workspace-drawer[^{]*\{[^}]*z-index: var\(--layer-drawer\)/);
assert.match(workspace, /interactive=\{drawer === null/);
assert.match(mapCanvas, /handler\.enable\(\) : handler\.disable\(\)/);

console.log('Presentation tests passed: home visual, desktop view mode, map lazy load, and overlay layering.');
