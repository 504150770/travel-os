export type CurrentLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

export type LocationState =
  | { status: 'idle'; position: null; message: null }
  | { status: 'locating'; position: CurrentLocation | null; message: null }
  | { status: 'ready'; position: CurrentLocation; message: null }
  | { status: 'error'; position: CurrentLocation | null; message: string };

export const initialLocationState: LocationState = {
  status: 'idle',
  position: null,
  message: null,
};

export function currentLocationFromCoordinates(coords: Pick<GeolocationCoordinates, 'latitude' | 'longitude' | 'accuracy'>): CurrentLocation {
  return { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy };
}

export function locationFailureMessage(code?: number) {
  if (typeof window !== 'undefined' && !window.isSecureContext) return 'Location requires a secure connection.';
  if (code === 1) return 'Location permission was denied.';
  if (code === 2) return 'Location is unavailable right now.';
  if (code === 3) return 'Location request timed out.';
  return 'Location unavailable.';
}

export function approximateDistanceLabel(
  position: CurrentLocation,
  destination: { lat: number; lng: number },
) {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(destination.lat - position.lat);
  const dLng = radians(destination.lng - position.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(position.lat)) * Math.cos(radians(destination.lat)) * Math.sin(dLng / 2) ** 2;
  const kilometers = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return kilometers < 1
    ? `~${Math.max(10, Math.round(kilometers * 1000 / 10) * 10)} m away`
    : `~${kilometers.toFixed(kilometers < 10 ? 1 : 0)} km away`;
}
