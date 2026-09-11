'use client';

import { lazy, Suspense, useMemo, useState } from 'react';
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

const MobileMapScreen = lazy(async () => {
  const loaded = await import('@/components/mobile/MobileMapScreen');
  return { default: loaded.MobileMapScreen };
});

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
        food,
        gym,
      }),
    [controller.resolve, food, gym, trip.planDay, trip.stay],
  );

  return (
    <>
      {controller.mobileView === 'map' ? (
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
          />
        </Suspense>
      ) : (
        <MobileToday
          controller={controller}
          trip={trip}
          food={food}
          gym={gym}
          openEntity={setEntity}
          openHotel={() => setHotelOpen(true)}
          openActions={setActions}
          openDayPicker={openDayPicker}
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
