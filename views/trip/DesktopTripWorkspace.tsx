'use client';

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Dumbbell,
  Info,
  Map as MapIcon,
  PanelsTopLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Route,
  Search,
  Utensils,
  LocateFixed,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';
import type { Entity } from '@/lib/entity-library';
import type { CustomEntity, LightboxImage } from '@/features/app/appModel';
import type { useEditablePlan } from '@/hooks/use-editable-plan';
import { guideData } from '@/lib/data';
import type { Day } from '@/lib/types';
import { routeCityForDay } from '@/features/trip/tripModel';
import { useTripController } from '@/features/trip/useTripController';
import { selectDayMapPoints, selectRelevantFood } from '@/features/map/mapSelectors';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { DesktopTripTimeline } from '@/views/trip/DesktopTripTimeline';
import { DesktopTripMap } from '@/views/trip/DesktopTripMap';
import { DesktopTripOverview } from '@/views/trip/DesktopTripOverview';
import { DayDetailsDrawer, EntityDetailDrawer, ExploreDrawer } from '@/views/trip/DesktopTripDrawers';
import { GymDetailModal } from '@/views/trip/DayGym';
import { QuickAdd } from '@/views/trip/QuickAdd';
import '@/views/trip/desktop-workspace.css';
import { useCurrentLocation } from '@/features/map/location/useCurrentLocation';
import { useWeatherContext } from '@/features/weather/useWeatherContext';
import { WeatherChip } from '@/components/weather/WeatherChip';
import type { ActionItem } from '@/lib/action-queue';
import { actionForDay } from '@/features/readiness/readinessModel';
import {
  buildPlanPresentation,
  buildTodaysTips,
  countPlanStatuses,
} from '@/features/trip/tripPresentationModel';
import { DayStatusSummary } from '@/components/trip/TripStatusBadge';

const DEFAULT_PANEL = 420;
const MIN_PANEL = 340;
const MAX_PANEL = 560;
const PANEL_KEY = 'travel.desktop.tripPanelWidth';
const COMPACT_QUERY = '(max-width: 899px)';

function compactSubscribe(callback: () => void) {
  const query = window.matchMedia(COMPACT_QUERY);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}
const compactSnapshot = () => window.matchMedia(COMPACT_QUERY).matches;
const initialPanelWidth = () => {
  if (typeof window === 'undefined') return DEFAULT_PANEL;
  const saved = window.localStorage.getItem(PANEL_KEY);
  if (saved === null) return DEFAULT_PANEL;
  const value = Number(saved);
  return Number.isFinite(value) ? Math.min(MAX_PANEL, Math.max(MIN_PANEL, value)) : DEFAULT_PANEL;
};

export type DesktopTripWorkspaceProps = {
  selectedDay: number;
  setSelectedDay: (day: number) => void;
  resolve: (id: string) => Entity | undefined;
  entities: Entity[];
  actions: ReturnType<typeof useEditablePlan>;
  open: (image: LightboxImage) => void;
  clock: Date | null;
  addCustom: (entity: CustomEntity, target: 'activeItems' | 'alternatives', duration: string) => void;
  preferredTransport: Record<string, string>;
  tomorrowAction?: string;
  bookingStatuses: Record<string, string>;
  actionStatuses: Record<string, string>;
  privateLinks: Record<string, string>;
  actionQueue: ActionItem[];
};

export default function DesktopTripWorkspace(props: DesktopTripWorkspaceProps) {
  const {
    selectedDay, setSelectedDay, resolve, entities, actions, open, addCustom,
    preferredTransport, tomorrowAction, bookingStatuses, actionStatuses, privateLinks, actionQueue,
  } = props;
  const trip = useTripController({ selectedDay, setSelectedDay, resolve, entities, actions, tomorrowAction });
  const compact = useSyncExternalStore(compactSubscribe, compactSnapshot, () => false);
  const panelRef = useRef<PanelImperativeHandle | null>(null);
  const [panelWidth, setPanelWidth] = useState(initialPanelWidth);
  const [panelEpoch, setPanelEpoch] = useState(0);
  const [planCollapsed, setPlanCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'map'>('overview');
  const [mapOpened, setMapOpened] = useState(false);
  const [dayPicker, setDayPicker] = useState(false);
  const dayNavRef = useRef<HTMLDivElement>(null);
  const dayButtonRef = useRef<HTMLButtonElement>(null);
  const [drawer, setDrawer] = useState<'details' | 'explore' | 'entity' | null>(null);
  const [detailEntity, setDetailEntity] = useState<Entity | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [selectedLegId, setSelectedLegId] = useState<string | null>(null);
  const [showRoute, setShowRoute] = useState(true);
  const [showFood, setShowFood] = useState(false);
  const [showGym, setShowGym] = useState(false);
  const [fitRequest, setFitRequest] = useState(0);
  const [candidates, setCandidates] = useState<Entity[]>([]);
  const mapOpenStartedAt = useRef<number | null>(null);
  const location = useCurrentLocation();

  useEffect(() => {
    if (!dayPicker) return;
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !dayNavRef.current?.contains(event.target)) setDayPicker(false);
    };
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const targetDialog = event.target instanceof Element ? event.target.closest('dialog[open]') : null;
      if (targetDialog && !dayNavRef.current?.contains(targetDialog)) return;
      event.preventDefault();
      event.stopPropagation();
      setDayPicker(false);
      dayButtonRef.current?.focus();
    };
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissEscape);
    };
  }, [dayPicker]);

  const food = useMemo(() => selectRelevantFood({ entities, day: trip.day, planDay: trip.planDay }), [entities, trip.day, trip.planDay]);
  const currentIds = useMemo(() => new Set(trip.planDay.activeItems.map((item) => item.entityId)), [trip.planDay.activeItems]);
  const markerCandidates = useMemo(() => candidates.filter((entity) => !currentIds.has(entity.id)), [candidates, currentIds]);
  const routePoints = useMemo(() => selectDayMapPoints({
    stay: trip.stay,
    planDay: trip.planDay,
    resolve,
  }), [resolve, trip.planDay, trip.stay]);
  const points = useMemo(() => selectDayMapPoints({
    stay: trip.stay,
    planDay: trip.planDay,
    resolve,
    food: showFood ? food : [],
    gyms: showGym ? trip.optionalGyms : [],
    candidates: drawer === 'explore' ? markerCandidates : [],
  }), [drawer, food, markerCandidates, resolve, showFood, showGym, trip.optionalGyms, trip.planDay, trip.stay]);
  const weather = useWeatherContext({
    city: routeCityForDay(trip.day),
    date: trip.day.date,
    coordinates: trip.stay?.coordinates,
  });
  const dayAction = useMemo(() => actionForDay(actionQueue, trip.day.date), [actionQueue, trip.day.date]);
  const planRows = useMemo(
    () => buildPlanPresentation(trip.planDay, resolve, bookingStatuses),
    [bookingStatuses, resolve, trip.planDay],
  );
  const statusCounts = useMemo(() => countPlanStatuses(planRows), [planRows]);
  const todaysTips = useMemo(
    () => buildTodaysTips(planRows, trip.currentRoute),
    [planRows, trip.currentRoute],
  );

  const changeDay = (day: number) => {
    setDayPicker(false);
    setSelectedPointId(null);
    setSelectedLegId(null);
    setCandidates([]);
    trip.changeDay(day);
  };

  const setExploreCandidates = useCallback((items: Entity[]) => setCandidates(items), []);
  const selectPoint = (id: string) => { setSelectedPointId(id); setSelectedLegId(null); };
  const openDetails = (entity: Entity | null, hotel: boolean) => {
    if (hotel) { setDrawer('details'); return; }
    if (entity) { setDetailEntity(entity); setDrawer('entity'); }
  };
  const closeDrawer = () => { setDrawer(null); setCandidates([]); };
  const addCandidate = (entity: Entity) => {
    actions.addEntity(entity.id, selectedDay, 'activeItems');
    setSelectedPointId(entity.id);
  };
  const showMap = () => {
    const startedAt = performance.now();
    document.documentElement.dataset.desktopMapOpenStartedAt = String(Math.round(startedAt));
    if (mapOpened && document.documentElement.dataset.desktopMapFirstOpenMs) {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        document.documentElement.dataset.desktopMapSecondOpenMs = String(Math.round(performance.now() - startedAt));
      }));
    } else mapOpenStartedAt.current = startedAt;
    setMapOpened(true);
    setViewMode('map');
  };
  const handleMapStage = (stage: 'initialized' | 'markers' | 'tiles' | 'route') => {
    if (mapOpenStartedAt.current == null) return;
    const elapsed = String(Math.round(performance.now() - mapOpenStartedAt.current));
    if (stage === 'markers' && !document.documentElement.dataset.desktopMapFirstOpenMs) {
      document.documentElement.dataset.desktopMapFirstOpenMs = elapsed;
    }
    if (stage === 'tiles' && !document.documentElement.dataset.desktopMapTilesUsableMs) {
      document.documentElement.dataset.desktopMapTilesUsableMs = elapsed;
    }
    if (stage === 'route' && !document.documentElement.dataset.desktopMapRouteVisibleMs) {
      document.documentElement.dataset.desktopMapRouteVisibleMs = elapsed;
    }
  };
  const resetPanel = () => {
    window.localStorage.setItem(PANEL_KEY, String(DEFAULT_PANEL));
    setPanelWidth(DEFAULT_PANEL);
    setPanelEpoch((value) => value + 1);
    setPlanCollapsed(false);
  };
  const togglePlan = () => {
    if (compact) setPlanCollapsed((value) => !value);
    else if (panelRef.current?.isCollapsed()) { panelRef.current.expand(); setPlanCollapsed(false); }
    else { panelRef.current?.collapse(); setPlanCollapsed(true); }
  };
  const planPane = <section className="workspace-plan-pane">
    <header className="workspace-timeline-heading">
      <span>{new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', weekday: 'short', timeZone: 'UTC' }).format(new Date(`${trip.day.date}T00:00:00Z`))}</span>
      <h2>Day {trip.day.day} · {routeCityForDay(trip.day)}</h2>
      <p>{trip.planDay.activeItems.length} 项安排{trip.currentRoute.summary.walkingKm == null ? '' : ` · 已知步行 ${trip.currentRoute.summary.walkingKm} km`}</p>
      <DayStatusSummary counts={statusCounts} />
    </header>
    <DesktopTripTimeline
      dayId={selectedDay}
      rows={planRows}
      route={trip.currentRoute}
      selectedPointId={selectedPointId}
      selectedLegId={selectedLegId}
      selectPoint={selectPoint}
      selectLeg={setSelectedLegId}
      actions={actions}
    />
  </section>;
  const contentPane = <section className="workspace-content-pane" data-workspace-view={viewMode}>
    {viewMode === 'overview' && <DesktopTripOverview
      day={trip.day}
      hero={trip.hero}
      dayState={trip.dayState}
      food={food}
      gyms={trip.optionalGyms}
      stay={trip.stay}
      dayAction={dayAction}
      tips={todaysTips}
      openGallery={(gallery) => open(gallery)}
      openHotel={() => { setDrawer('details'); setDetailEntity(null); }}
      inspect={(entity) => { setDetailEntity(entity); setDrawer('entity'); }}
    />}
    {mapOpened && <div className="workspace-map-stage" hidden={viewMode !== 'map'}>
      <DesktopTripMap
        points={points}
        routePoints={routePoints}
        route={trip.currentRoute}
        selectedPointId={selectedPointId}
        selectedLegId={selectedLegId}
        showRoute={showRoute}
        fitToken={`${selectedDay}:${fitRequest}`}
        selectPoint={selectPoint}
        resolve={resolve}
        openDetails={openDetails}
        addCandidate={addCandidate}
        currentLocation={location.state.position}
        locationFocusToken={location.focusToken}
        active={viewMode === 'map'}
        interactive={drawer === null && !trip.quick && !trip.selectedGym}
        onStage={handleMapStage}
      />
    </div>}
  </section>;

  return <div className={`desktop-trip-workspace ${compact ? 'compact' : ''}`} data-desktop-workspace>
    <header className="workspace-toolbar">
      <div className="workspace-day-nav" ref={dayNavRef}>
        <button disabled={selectedDay === 1} onClick={() => changeDay(selectedDay - 1)} aria-label="上一天"><ChevronLeft /></button>
        <button ref={dayButtonRef} className="workspace-day-button" onClick={() => setDayPicker((value) => !value)} aria-expanded={dayPicker} aria-haspopup="dialog">
          <span>Day {selectedDay} · {trip.day.date.slice(5).replace('-', '/')}</span><b>{routeCityForDay(trip.day)}</b><ChevronDown />
        </button>
        <button disabled={selectedDay === 18} onClick={() => changeDay(selectedDay + 1)} aria-label="下一天"><ChevronRight /></button>
        {dayPicker && <dialog open className="workspace-day-popover" aria-label="选择旅行日">
          {guideData.days.map((item) => <button key={item.day} className={item.day === selectedDay ? 'active' : ''} onClick={() => { changeDay(item.day); setDayPicker(false); }}><b>D{item.day}</b><span>{item.date.slice(5)} · {routeCityForDay(item as Day)}</span><small>{item.theme}</small></button>)}
        </dialog>}
      </div>
      <div className="workspace-tools">
        <WeatherChip weather={weather} />
        <div className="workspace-view-toggle" aria-label="Workspace view">
          <button className={viewMode === 'overview' ? 'active' : ''} onClick={() => setViewMode('overview')}><PanelsTopLeft /> Overview</button>
          <button className={viewMode === 'map' ? 'active' : ''} onClick={showMap}><MapIcon /> Map</button>
        </div>
        <button className="workspace-ghost-button" onClick={() => { setDrawer('details'); setDetailEntity(null); }}><Info /> Day details</button>
        <button className="workspace-ghost-button" onClick={() => { setDrawer('explore'); setDetailEntity(null); }}><Search /> Explore</button>
        <button className="workspace-ghost-button" onClick={togglePlan}>{planCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}{planCollapsed ? 'Show Plan' : 'Collapse'}</button>
      </div>
    </header>
    {viewMode === 'map' && <div className="workspace-map-tools" aria-label="Map layers">
      <button className={showRoute ? 'active' : ''} onClick={() => setShowRoute((value) => !value)}><Route /> Route</button>
      <button className={showFood ? 'active' : ''} onClick={() => setShowFood((value) => !value)}><Utensils /> Food</button>
      <button className={showGym ? 'active' : ''} onClick={() => setShowGym((value) => !value)}><Dumbbell /> Gym</button>
      <button onClick={() => setFitRequest((value) => value + 1)}><CircleDot /> Fit Day</button>
      <button onClick={location.request} disabled={location.state.status === 'locating'} title={location.state.status === 'error' ? location.state.message : undefined}><LocateFixed /> {location.state.status === 'locating' ? 'Locating' : 'My Location'}</button>
    </div>}
    {compact ? <div className="workspace-compact-stage">
      {contentPane}
      {!planCollapsed && planPane}
    </div> : <ResizablePanelGroup key={panelEpoch} id="desktop-trip-group" orientation="horizontal" className="workspace-split">
      <ResizablePanel id="plan" panelRef={panelRef} defaultSize={`${panelWidth}px`} minSize={`${MIN_PANEL}px`} maxSize={`${MAX_PANEL}px`} collapsible collapsedSize="0px" onResize={(size) => {
        setPlanCollapsed(size.inPixels < 20);
        if (size.inPixels >= MIN_PANEL) window.localStorage.setItem(PANEL_KEY, String(Math.round(size.inPixels)));
      }}>{planPane}</ResizablePanel>
      <ResizableHandle className="workspace-resize-handle" withHandle onDoubleClick={resetPanel} title="Drag to resize · double-click to reset" />
      <ResizablePanel id="content" minSize="320px">{contentPane}</ResizablePanel>
    </ResizablePanelGroup>}
    {planCollapsed && <button className="workspace-show-plan" onClick={togglePlan}><PanelLeftOpen /> Show Plan</button>}
    <DayDetailsDrawer open={drawer === 'details'} close={closeDrawer} day={trip.day} dayState={trip.dayState} entities={entities} resolve={resolve} actions={actions} openGallery={open} preferredTransport={preferredTransport} actionStatuses={actionStatuses} privateLinks={privateLinks} openGym={trip.setSelectedGym} />
    <ExploreDrawer open={drawer === 'explore'} close={closeDrawer} city={routeCityForDay(trip.day)} entities={entities} dayId={selectedDay} actions={actions} inspect={(entity) => { setDetailEntity(entity); setDrawer('entity'); }} onAdd={addCandidate} onCandidates={setExploreCandidates} openCustom={() => trip.openQuick('custom')} />
    <EntityDetailDrawer entity={drawer === 'entity' ? detailEntity : null} close={closeDrawer} dayId={selectedDay} actions={actions} openGallery={open} />
    {trip.quick && <QuickAdd dayId={selectedDay} mode={trip.quick} close={() => trip.setQuick(null)} entities={entities} add={actions.addEntity} addCustom={addCustom} />}
    {trip.selectedGym && <GymDetailModal entity={trip.selectedGym} dayId={selectedDay} actions={actions} open={open} close={() => trip.setSelectedGym(null)} />}
  </div>;
}
