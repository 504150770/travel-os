'use client';

import { useState } from 'react';
import quickPicks from '@/data/quick-picks.json';
import { normalizeRouteCity, type Entity, type EntityType } from '@/lib/entity-library';
import type { DiscoverTab } from '@/features/app/appModel';

const entityTypes: Record<Exclude<DiscoverTab, 'picks' | 'photos'>, EntityType[]> = {
  places: ['place', 'activity', 'photo_spot', 'custom'],
  food: ['restaurant', 'cafe'],
  gym: ['gym'],
  shopping: ['shopping'],
};

export function useDiscoverController({ tab, city, entities }: {
  tab: DiscoverTab; city: string; entities: Entity[];
}) {
  const [detailEntity, setDetailEntity] = useState<Entity | null>(null);
  const shown = tab === 'picks' || tab === 'photos' ? [] : entities
    .filter((entity) => normalizeRouteCity(entity.city) === city && entityTypes[tab].includes(entity.type))
    .sort((a, b) => Number(a.raw.hotelPriority ?? 99) - Number(b.raw.hotelPriority ?? 99));
  const picks = quickPicks.cities.find((item) => item.city === city)?.items ?? [];
  const photos = entities.filter((entity) =>
    normalizeRouteCity(entity.city) === city && entity.images.length > 0 && entity.type !== 'hotel',
  );
  return { detailEntity, setDetailEntity, shown, picks, photos };
}
