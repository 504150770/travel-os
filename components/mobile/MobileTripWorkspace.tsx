'use client';

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { Entity } from '@/lib/entity-library';
import type { AppController } from '@/features/app/useAppController';
import type { MobileMapPoint } from '@/features/mobile/mobileModel';
import { useTripController } from '@/features/trip/useTripController';
import {
  mobileFoodPicks,
  mobileMapPoints,
} from '@/features/mobile/mobileTripSelectors';
import {
  MobileToday,
  type ActionSelection,
} from '@/components/mobile/MobileToday';
import { MobileEntitySheet } from '@/components/mobile/MobileEntitySheet';
import { MobileHotelSheet } from '@/components/mobile/MobileHotelSheet';
import { MobilePlanItemSheet } from '@/components/mobile/MobilePlanItemSheet';
import { useCurrentLocation } from '@/features/map/location/useCurrentLocation';
import { approximateDistanceLabel } from '@/features/map/location/locationModel';
import { useWeatherContext } from '@/features/weather/useWeatherContext';
import { routeCityForDay } from '@/features/trip/tripModel';

const loadMobileMapScreen = async () => {
  const loaded = await import('@/components/mobile/MobileMapScreen');
  return { default: loaded.MobileMapScreen };
};
const MobileMapScreen = lazy(loadMobileMapScreen);

export function MobileTripWorkspace({
  controller,
  openDayPicker,
}: {
  controller: AppController;
  openDayPicker: () => void;
}) {
  const trip = useTripController({
    selectedDay: controller.selectedDay,
    setSelectedDay: controller.selectMobileDay,
    resolve: controller.resolve,
    entities: controller.entities,
    actions: controller.actions,
    tomorrowAction: controller.nextAction?.title,
  });
  const [entity, setEntity] = useState<Entity | null>(null);
  const [hotelOpen, setHotelOpen] = useState(false);
  const [actions, setActions] = useState<ActionSelection | null>(null);
  const [mapPoint, setMapPoint] = useState<MobileMapPoint | null>(null);
  const [mapVisited, setMapVisited] = useState(controller.mobileView === 'map');
  const location = useCurrentLocation();
  const food = useMemo(
    () =>
      mobileFoodPicks({
        entities: controller.entities,
        day: trip.day,
        planDay: trip.planDay,
      }),
    [controller.entities, trip.day, trip.planDay],
  );
  const gym = trip.optionalGyms[0];
  const mapPoints = useMemo(
    () =>
      mobileMapPoints({
        stay: trip.stay,
        planDay: trip.planDay,
        resolve: controller.resolve,
      }),
    [controller.resolve, trip.planDay, trip.stay],
  );

  useEffect(() => {
    if (controller.mobileView === 'map') return;
    const preload = () => { void loadMobileMapScreen(); };
    const idleWindow = window as unknown as {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const request = idleWindow.requestIdleCallback(preload, { timeout: 1800 });
      return () => idleWindow.cancelIdleCallback?.(request);
    }
    const timer = globalThis.setTimeout(preload, 700);
    return () => globalThis.clearTimeout(timer);
  }, [controller.mobileView]);

  useEffect(() => {
    if (controller.mobileView !== 'map' || mapVisited) return;
    const timer = globalThis.setTimeout(() => setMapVisited(true), 0);
    return () => globalThis.clearTimeout(timer);
  }, [controller.mobileView, mapVisited]);

  const weather = useWeatherContext({
    city: routeCityForDay(trip.day),
    date: trip.day.date,
    coordinates: trip.stay?.coordinates,
  });
  const nextStop = mapPoints.find((point) => point.kind === 'stop');
  const nextStopDistance = location.state.position && nextStop
    ? approximateDistanceLabel(location.state.position, nextStop)
    : undefined;

  return (
    <>
      {(controller.mobileView === 'map' || mapVisited) && (
        <div hidden={controller.mobileView !== 'map'}>
        <Suspense fallback={<div className="mobile-map-loading">Preparing map…</div>}>
          <MobileMapScreen
            route={trip.currentRoute}
            points={mapPoints}
            food={food}
            gym={gym}
            selected={mapPoint}
            select={setMapPoint}
            openEntity={setEntity}
            resolve={controller.resolve}
            location={location.state}
            requestLocation={location.request}
            locationFocusToken={location.focusToken}
          />
        </Suspense>
        </div>
      )}
      {controller.mobileView !== 'map' && (
        <MobileToday
          controller={controller}
          trip={trip}
          food={food}
          gym={gym}
          openEntity={setEntity}
          openHotel={() => setHotelOpen(true)}
          openActions={setActions}
          openDayPicker={openDayPicker}
          weather={weather}
          nextStopDistance={nextStopDistance}
        />
      )}
      <MobileEntitySheet
        entity={entity}
        close={() => setEntity(null)}
        controller={controller}
      />
      <MobileHotelSheet
        stay={hotelOpen ? (trip.stay ?? null) : null}
        close={() => setHotelOpen(false)}
        controller={controller}
      />
      <MobilePlanItemSheet
        item={actions?.item ?? null}
        entity={actions?.entity ?? null}
        index={actions?.index ?? 0}
        total={actions?.total ?? 0}
        close={() => setActions(null)}
        controller={controller}
      />
    </>
  );
}
