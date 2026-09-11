'use client';

import { useCallback, useState } from 'react';
import { currentLocationFromCoordinates, initialLocationState, locationFailureMessage, type LocationState } from '@/features/map/location/locationModel';

export function useCurrentLocation() {
  const [state, setState] = useState<LocationState>(initialLocationState);
  const [focusToken, setFocusToken] = useState(0);
  const request = useCallback(() => {
    if (state.position) {
      setFocusToken((value) => value + 1);
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation || !window.isSecureContext) {
      setState({ status: 'error', position: null, message: locationFailureMessage() });
      return;
    }
    setState({ status: 'locating', position: null, message: null });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setState({
          status: 'ready',
          position: currentLocationFromCoordinates(coords),
          message: null,
        });
        setFocusToken((value) => value + 1);
      },
      (error) => setState({ status: 'error', position: null, message: locationFailureMessage(error.code) }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  }, [state.position]);
  return { state, request, focusToken };
}
