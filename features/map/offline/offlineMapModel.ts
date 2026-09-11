export const OFFLINE_TILE_POLICY = {
  provider: 'OpenStreetMap Standard',
  downloadAllowed: false,
  strategy: 'runtime-cache-and-external-app',
  zooms: [14, 15, 16],
  averageTileBytes: 25 * 1024,
} as const;

export type OfflineMapPoint = {
  city: string;
  lat: number;
  lng: number;
};

export type OfflineCityManifest = {
  city: string;
  bounds: { south: number; west: number; north: number; east: number };
  estimatedTiles: number;
  estimatedSizeMb: number;
  downloadable: false;
};

const lngToTile = (lng: number, zoom: number) => (lng + 180) / 360 * 2 ** zoom;
const latToTile = (lat: number, zoom: number) => {
  const radians = lat * Math.PI / 180;
  return (1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 * 2 ** zoom;
};

export function estimateTileCount(
  bounds: OfflineCityManifest['bounds'],
  zooms: readonly number[] = OFFLINE_TILE_POLICY.zooms,
) {
  return zooms.reduce((total, zoom) => {
    const minX = Math.floor(lngToTile(bounds.west, zoom));
    const maxX = Math.floor(lngToTile(bounds.east, zoom));
    const minY = Math.floor(latToTile(bounds.north, zoom));
    const maxY = Math.floor(latToTile(bounds.south, zoom));
    return total + (maxX - minX + 1) * (maxY - minY + 1);
  }, 0);
}

export function buildOfflineMapManifest(points: OfflineMapPoint[]): OfflineCityManifest[] {
  const grouped = new Map<string, OfflineMapPoint[]>();
  points.forEach((point) => grouped.set(point.city, [...(grouped.get(point.city) ?? []), point]));
  return [...grouped.entries()].map(([city, items]) => {
    const lats = items.map((item) => item.lat);
    const lngs = items.map((item) => item.lng);
    const latSpan = Math.max(0.02, Math.max(...lats) - Math.min(...lats));
    const lngSpan = Math.max(0.02, Math.max(...lngs) - Math.min(...lngs));
    const bounds = {
      south: Math.min(...lats) - latSpan * 0.18,
      west: Math.min(...lngs) - lngSpan * 0.18,
      north: Math.max(...lats) + latSpan * 0.18,
      east: Math.max(...lngs) + lngSpan * 0.18,
    };
    const estimatedTiles = estimateTileCount(bounds);
    return {
      city,
      bounds,
      estimatedTiles,
      estimatedSizeMb: Math.max(1, Math.round(estimatedTiles * OFFLINE_TILE_POLICY.averageTileBytes / 1024 / 1024)),
      downloadable: false as const,
    };
  });
}

const xmlEscape = (value: string) => value
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&apos;');

export function buildDayGpx(name: string, points: Array<{ name: string; lat: number; lng: number }>) {
  const routePoints = points.map((point) =>
    `    <rtept lat="${point.lat}" lon="${point.lng}"><name>${xmlEscape(point.name)}</name></rtept>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Europe 18 Day Travel OS" xmlns="http://www.topografix.com/GPX/1/1">\n  <metadata><name>${xmlEscape(name)}</name></metadata>\n  <rte><name>${xmlEscape(name)}</name>\n${routePoints}\n  </rte>\n</gpx>\n`;
}
