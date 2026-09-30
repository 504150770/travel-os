import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const home = read('views/home/HomeView.tsx');
const shell = read('components/shell/DesktopShell.tsx');
const appShell = read('components/shell/AppShell.tsx');
const personalMenu = read('components/shell/PersonalMenu.tsx');
const tripView = read('views/trip/TripView.tsx');
const workspace = read('views/trip/DesktopTripWorkspace.tsx');
const overview = read('views/trip/DesktopTripOverview.tsx');
const timeline = read('views/trip/DesktopTripTimeline.tsx');
const desktopMap = read('views/trip/DesktopTripMap.tsx');
const mapCanvas = read('components/map/MapCanvas.tsx');
const routeGeometry = read('features/map/routing/useRouteGeometry.ts');
const globalCss = read('app/globals.css');
const workspaceCss = read('views/trip/desktop-workspace.css');
const planView = read('views/plan/PlanView.tsx');
const executionCards = read('components/execution-cards.tsx');

// Completion icons reflect state without changing action handlers or storage.
assert.match(planView, /status === 'Done' \? <Check \/> : status === 'Waiting' \? <Clock3 \/> : <Circle \/>/);
assert.match(executionCards, /checked \? <Check \/> : <Circle \/>/);
assert.match(globalCss, /\.deadline-center time[^}]*gap: 4px/);
assert.match(globalCss, /\.essentials-v2 summary::-webkit-details-marker[^}]*display: none/);
assert.match(read('components/packing/PackingPanel.tsx'), /value=\{value\}>\{categoryLabels\[value\]\}/);
assert.match(read('components/mobile/MobileToday.tsx'), /<b>\{rows.length\}<\/b> 项安排/);
assert.match(read('components/mobile/MobileToday.tsx'), /tomorrow.split\('；待办：'\)\[0\]/);

// home-visual
assert.match(home, /HOME_HERO = '\/images\/home-eiffel-winter-sunset\.png'/);
assert.match(home, /HOME_HERO_MOBILE = '\/images\/home-eiffel-winter-mobile\.webp'/);
assert.match(home, /<source media="\(max-width: 767px\)" srcSet=\{HOME_HERO_MOBILE\}/);
assert.match(home, /A Winter Journey Through Six Cities/);
for (const city of ['rome', 'florence', 'venice', 'vienna', 'prague', 'paris']) {
  assert.match(home, new RegExp(`home-city-${city}\\.webp`));
}
assert.match(home, /guideData\.trip\.cities\.map/);
assert.match(home, /nextAction\?\.title/);
assert.match(home, /projectedBudget/);
assert.match(home, /activeEntityCount/);
assert.doesNotMatch(globalCss, /route-ribbon > div:nth-child/);
assert.doesNotMatch(shell, /v2-topbar/);
assert.match(home, /预计总额/);
assert.match(home, /实际记录 \{yuan\(actualTotal\)\}/);
assert.match(read('views/discover/DiscoverView.tsx'), /<details className="explore-context">/);
assert.match(read('components/mobile/MobilePlan.tsx'), /从容准备，安心出发/);
assert.match(read('components/mobile/MobileExplore.tsx'), /aria-label=\{`查看 \$\{entity.name\}`\}/);
assert.doesNotMatch(read('components/mobile/MobileExplore.tsx'), /<span>\{entity.type\}<\/span>/);
assert.match(read('components/mobile/mobile.css'), /\.mobile-stay-list b[^}]*overflow-wrap: anywhere/);
assert.match(appShell, /isMobile && view === 'home'/);
assert.doesNotMatch(shell, /side-meta|当前旅行日|当前查看日/);
assert.match(shell, /PersonalMenu/);
assert.match(personalMenu, /jacob-personal-mark\.webp/);
assert.match(personalMenu, /Backup \/ Export/);
assert.match(personalMenu, /Saved \/ Local status/);
assert.match(personalMenu, /travel-save-state/);

// desktop-view-mode
assert.match(workspace, /useState<'overview' \| 'map'>\('overview'\)/);
assert.match(workspace, /const \[mapOpened, setMapOpened\] = useState\(false\)/);
assert.match(workspace, /aria-label="Workspace view"/);
assert.match(workspace, /mapOpened && <div className="workspace-map-stage"/);
assert.match(workspace, /hidden=\{viewMode !== 'map'\}/);
assert.match(overview, /data-trip-overview/);
assert.doesNotMatch(overview, /TODAY SUMMARY|NEXT STOP|TODAY(?:&apos;|')S ROUTE/);
assert.match(overview, /workspace-place-grid/);
assert.match(overview, /stay\.hotelName/);
assert.match(workspace, /actionForDay\(actionQueue, trip\.day\.date\)/);
assert.match(workspaceCss, /workspace-overview-scroll[^}]*box-sizing: border-box[^}]*overflow-y: auto/);
assert.match(timeline, /activityIllustration\(name\)/);
assert.match(timeline, /entity\.type !== 'activity'/);
assert.doesNotMatch(timeline, /<span>\{index \+ 1\}<\/span>/);

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
