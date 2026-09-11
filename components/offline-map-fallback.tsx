'use client';

import { Download, ExternalLink, MapPinned, ShieldCheck } from 'lucide-react';
import type { Entity } from '@/lib/entity-library';
import { normalizeRouteCity } from '@/lib/entity-library';
import type { EditablePlan } from '@/hooks/use-editable-plan';
import { guideData } from '@/lib/data';
import { hotelForNight, realStays, routeCityForDay } from '@/features/trip/tripModel';
import { buildDayGpx, buildOfflineMapManifest, OFFLINE_TILE_POLICY } from '@/features/map/offline/offlineMapModel';
import '@/components/travel-intelligence.css';

export function OfflineMapFallback({
  selectedDay,
  plan,
  entities,
  resolve,
}: {
  selectedDay: number;
  plan: EditablePlan;
  entities: Entity[];
  resolve: (id: string) => Entity | undefined;
}) {
  const scope = new Set(plan.days.flatMap((day) => day.activeItems.map((item) => item.entityId)));
  const points = [
    ...realStays.flatMap((stay) => stay.coordinates ? [{ city: normalizeRouteCity(stay.city), ...stay.coordinates }] : []),
    ...entities.flatMap((entity) => {
      if (!entity.coordinates) return [];
      const isPlan = scope.has(entity.id);
      const isTopCompanion = ['restaurant', 'cafe', 'gym'].includes(entity.type) && Number(entity.raw.hotelPriority ?? 99) <= 2;
      return isPlan || isTopCompanion ? [{ city: normalizeRouteCity(entity.city), ...entity.coordinates }] : [];
    }),
  ];
  const manifest = buildOfflineMapManifest(points);
  const day = guideData.days[selectedDay - 1];
  const planDay = plan.days[selectedDay - 1];
  const stay = hotelForNight(day.date) ?? realStays.find((item) => item.checkIn === day.date);
  const gpxPoints = [
    ...(stay?.coordinates ? [{ name: stay.hotelName, ...stay.coordinates }] : []),
    ...planDay.activeItems.flatMap((item) => {
      const entity = resolve(item.entityId);
      return entity?.coordinates ? [{ name: entity.name, ...entity.coordinates }] : [];
    }),
  ];
  if (stay?.coordinates && gpxPoints.length > 1) gpxPoints.push({ name: stay.hotelName, ...stay.coordinates });
  const downloadGpx = () => {
    const title = `Day ${selectedDay} · ${routeCityForDay(day)}`;
    const url = URL.createObjectURL(new Blob([buildDayGpx(title, gpxPoints)], { type: 'application/gpx+xml' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `travel-os-day-${selectedDay}.gpx`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <section className="offline-map-fallback">
    <header><MapPinned /><div><span>OFFLINE MAPS</span><h2>Use a dedicated offline map</h2></div></header>
    <p>Current OpenStreetMap Standard tiles support normal interactive caching, not bulk city downloads. Travel OS will not prefetch them against provider policy.</p>
    <div className="offline-city-estimates">
      {manifest.map((city) => <div key={city.city}>
        <span><b>{city.city}</b><small>Trip area · zoom {OFFLINE_TILE_POLICY.zooms[0]}–{OFFLINE_TILE_POLICY.zooms.at(-1)}</small></span>
        <em>~{city.estimatedSizeMb} MB*</em>
      </div>)}
    </div>
    <small>*Planning estimate only; no tiles are downloaded by Travel OS.</small>
    <div className="offline-map-actions">
      <button onClick={downloadGpx} disabled={!gpxPoints.length}><Download /> Export Day {selectedDay} GPX</button>
      <a href="https://organicmaps.app/" target="_blank" rel="noreferrer"><ExternalLink /> Organic Maps</a>
      <a href="https://www.comaps.app/" target="_blank" rel="noreferrer"><ExternalLink /> CoMaps</a>
    </div>
    <p className="offline-policy-note"><ShieldCheck /> GPX contains only the hotel and verified Current Plan coordinates already in this browser.</p>
  </section>;
}
