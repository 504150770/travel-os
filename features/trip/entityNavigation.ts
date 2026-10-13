import type { Entity } from '@/lib/entity-library';
import { mapLinks } from '@/features/trip/tripModel';

// Activities may describe a task or a multi-leg journey rather than one place.
// Their generated mapQuery is the activity name, so it is not location evidence.
export function navigationForEntity(entity: Entity) {
  const links = mapLinks(entity);
  if (entity.type !== 'activity') {
    return { google: links.google, apple: links.apple, fromHotel: entity.hotelAnchor?.directionsUrl ?? null };
  }
  const coordinates = entity.coordinates;
  const hasCoordinates = coordinates && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng)
    && Math.abs(coordinates.lat) <= 90 && Math.abs(coordinates.lng) <= 180;
  const address = entity.address.trim();
  const hasAddress = address && address !== entity.name.trim()
    && !/待确认|待核实|未知|待补充|未提供|不适用|→|↔|->|^(?:unknown|pending|tbd|n\/a|—|-)$/i.test(address);
  const destination = hasCoordinates ? `${coordinates.lat},${coordinates.lng}` : hasAddress ? address : null;
  if (!destination) return { google: null, apple: null, fromHotel: null };

  const destinationLinks = mapLinks({ ...entity, mapQuery: destination });
  let fromHotel: string | null = null;
  if (entity.hotelAnchor) {
    try {
      const directions = new URL(entity.hotelAnchor.directionsUrl);
      directions.searchParams.set('destination', destination);
      fromHotel = directions.toString();
    } catch { /* An invalid directions URL cannot supply a hotel route. */ }
  }
  return { google: destinationLinks.google, apple: destinationLinks.apple, fromHotel };
}
