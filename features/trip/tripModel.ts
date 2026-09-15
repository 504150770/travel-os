import { guideData } from '@/lib/data';
import { normalizeRouteCity, type Entity } from '@/lib/entity-library';
import type {
  Day,
  DayRoute,
  HotelBooking,
  TransitDayExecution,
  TransportSegment,
} from '@/lib/types';

export const routeCityForDay = (day: Day) => normalizeRouteCity(day.city);
export const realStays = guideData.hotelBookings.items as HotelBooking[];
export const transportSegments = guideData.transportRecommendations
  .segments as TransportSegment[];
export const dayRoutes = guideData.dayRoutes as DayRoute[];
export const transitExecutions =
  guideData.transitDayExecution as TransitDayExecution[];

export const hotelForCity = (city: string) =>
  realStays.find(
    (stay) => normalizeRouteCity(stay.city) === normalizeRouteCity(city),
  );

export const hotelForNight = (date: string) =>
  realStays.find((stay) => date >= stay.checkIn && date < stay.checkOut);

export const mapLinks = (entity: Entity) => ({
  google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entity.mapQuery || entity.name)}`,
  apple: `https://maps.apple.com/?q=${encodeURIComponent(entity.mapQuery || entity.name)}`,
  xhs: `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(`${entity.city} ${entity.name} 攻略`)}`,
});

export const ticketBookingByEntity: Record<string, string> = {
  colosseum: 'colosseum',
  vatican_museums: 'vatican',
  pantheon: 'pantheon',
  st_mark_basilica: 'stmark',
  schonbrunn: 'schonbrunn',
  prague_castle: 'praguecastle',
  st_vitus: 'praguecastle',
  louvre: 'louvre',
  arc_triomphe: 'arc',
};

export const todayDay = (date: Date) => {
  const start = new Date(`${guideData.trip.startDate}T00:00:00`);
  const end = new Date(`${guideData.trip.endDate}T23:59:59`);
  if (date < start) return 1;
  if (date > end) return 18;
  return Math.min(
    18,
    Math.floor((date.getTime() - start.getTime()) / 86400000) + 1,
  );
};
