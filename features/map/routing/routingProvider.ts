export type RoutingProfile = 'foot' | 'car' | 'bike';

export type RouteEndpoint = {
  lat: number;
  lng: number;
};

export type RoutedGeometry = {
  coordinates: [number, number][];
  provider: string;
};

export type RoutingProvider = {
  id: string;
  route: (
    origin: RouteEndpoint,
    destination: RouteEndpoint,
    profile: RoutingProfile,
    signal?: AbortSignal,
  ) => Promise<RoutedGeometry>;
};

