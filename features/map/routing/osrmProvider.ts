import type { RoutedGeometry, RoutingProfile, RoutingProvider } from '@/features/map/routing/routingProvider';

const ROUTING_ORIGIN = 'https://routing.openstreetmap.de';
const backendForProfile: Record<RoutingProfile, string> = {
  foot: 'routed-foot',
  car: 'routed-car',
  bike: 'routed-bike',
};

type OsrmResponse = {
  code?: string;
  routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
};

export const fossgisOsrmProvider: RoutingProvider = {
  id: 'fossgis-osrm',
  async route(origin, destination, profile, signal): Promise<RoutedGeometry> {
    const backend = backendForProfile[profile];
    const pair = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const params = new URLSearchParams({ overview: 'full', geometries: 'geojson', steps: 'false' });
    const response = await fetch(
      `${ROUTING_ORIGIN}/${backend}/route/v1/driving/${pair}?${params}`,
      { signal, headers: { Accept: 'application/json' } },
    );
    if (!response.ok) throw new Error(`Routing unavailable (${response.status})`);
    const payload = await response.json() as OsrmResponse;
    const coordinates = payload.routes?.[0]?.geometry?.coordinates;
    if (payload.code !== 'Ok' || !coordinates || coordinates.length < 2) {
      throw new Error('No routed geometry returned');
    }
    return {
      provider: 'FOSSGIS OSRM',
      coordinates: coordinates.map(([lng, lat]) => [lat, lng]),
    };
  },
};

