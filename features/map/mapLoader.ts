const importMapCanvas = () => import('@/components/map/MapCanvas');
let mapCanvasPromise: ReturnType<typeof importMapCanvas> | null = null;

export const loadMapCanvas = () => {
  if (mapCanvasPromise) return mapCanvasPromise;
  const startedAt = Date.now();
  if (typeof performance !== 'undefined') performance.mark('travel-map-import-start');
  mapCanvasPromise = importMapCanvas().then((module) => {
    if (typeof performance !== 'undefined') {
      performance.mark('travel-map-import-end');
      performance.measure('travel-map-import', 'travel-map-import-start', 'travel-map-import-end');
    }
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.mapImportMs = String(Date.now() - startedAt);
    }
    return module;
  });
  return mapCanvasPromise;
};

export const preloadMapCanvas = () => loadMapCanvas().then(() => undefined);
