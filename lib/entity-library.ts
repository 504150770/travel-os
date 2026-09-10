import places from '@/data/places.json';
import restaurants from '@/data/restaurants.json';
import gyms from '@/data/gyms.json';
import options from '@/data/options.json';
import activities from '@/data/activities.json';
import images from '@/data/images.json';
import shopping from '@/data/shopping.json';
import hotelBookings from '@/data/hotel-bookings.json';
import {
  normalizeGalleryImage,
  orderedGalleryImages,
  type GalleryImage,
} from '@/lib/media';

export type EntityType =
  | 'place'
  | 'restaurant'
  | 'cafe'
  | 'gym'
  | 'hotel'
  | 'shopping'
  | 'photo_spot'
  | 'activity'
  | 'custom';
export type EntityImage = GalleryImage;
export type Entity = {
  id: string;
  type: EntityType;
  name: string;
  city: string;
  address: string;
  mapQuery: string;
  coordinates: { lat: number; lng: number } | null;
  images: EntityImage[];
  description: string;
  priceLabel: string;
  projectedCostCny: number | null;
  openingHours: string;
  links: { source?: string; menu?: string | null };
  source: string;
  lastVerified: string;
  tags: string[];
  notes: string;
  hotelAnchor?: {
    id: string;
    name: string;
    address: string;
    directionsUrl: string;
  };
  raw: Record<string, unknown>;
};

const textValue = (value: unknown, fallback = '') =>
  typeof value === 'string' || typeof value === 'number'
    ? `${value}`
    : fallback;

const imageRows = images as Array<Record<string, unknown>>;
const imageFor = (placeId: string): EntityImage[] =>
  orderedGalleryImages(imageRows
    .filter((item) => item.placeId === placeId)
    .map((item) => normalizeGalleryImage({
      file: textValue(item.file),
      caption: textValue(item.caption),
      source: textValue(item.source || item.sourcePage || '') || null,
      sourcePage: textValue(item.sourcePage || '') || null,
      role: textValue(item.role || ''),
      title: textValue(item.title || item.caption),
      isCover: Boolean(item.isCover),
      priority: Number(item.priority ?? 99),
      entityId: textValue(item.entityId || item.placeId || placeId),
      lastVerified: textValue(item.lastVerified || '') || null,
      status: 'verified',
      bestTime: textValue(item.bestTime, '待确认'),
      composition: textValue(item.composition, '待确认'),
    }, { entityId: placeId, title: placeId })));

const placeEntities: Entity[] = (places as Array<Record<string, unknown>>).map(
  (item) => ({
    id: textValue(item.id),
    type: item.type === 'shop' ? 'shopping' : 'place',
    name: textValue(item.name),
    city: textValue(item.city),
    address: '待确认',
    mapQuery: textValue(item.mapQuery),
    coordinates:
      typeof item.lat === 'number' && typeof item.lng === 'number'
        ? { lat: item.lat, lng: item.lng }
        : null,
    images: imageFor(textValue(item.id)),
    description: '',
    priceLabel: '待确认',
    projectedCostCny: null,
    openingHours: '待确认',
    links: {},
    source: textValue(item.coordinateSource || '现有行程资料'),
    lastVerified: textValue(item.verifiedAt || '2026-09-06'),
    tags: [textValue(item.type)],
    notes: '',
    raw: item,
  }),
);

const optionEntities: Entity[] = (
  options as Array<Record<string, unknown>>
).map((item) => ({
  id: textValue(item.id),
  type: textValue(item.kind).includes('购物')
    ? 'shopping'
    : textValue(item.kind).includes('机位')
      ? 'photo_spot'
      : 'place',
  name: textValue(item.name),
  city: textValue(item.city),
  address: '待确认',
  mapQuery: textValue(item.mapQuery),
  coordinates: null,
  images: imageFor(textValue(item.id)),
  description: textValue(item.bestFor),
  priceLabel: textValue(item.booking),
  projectedCostCny: null,
  openingHours: '待确认',
  links: { source: textValue(item.source) },
  source: textValue(item.source),
  lastVerified: textValue(item.verifiedAt || '2026-09-06'),
  tags: [textValue(item.kind)],
  notes: textValue(item.swapRule),
  raw: item,
}));

const foodEntities: Entity[] = (
  restaurants as Array<Record<string, unknown>>
).map((item) => {
  const menu = item.menu as Record<string, unknown> | undefined;
  const sourceRows = Array.isArray(item.imageSources)
    ? (item.imageSources as Array<Record<string, unknown>>)
    : [];
  const normalizedRows = Array.isArray(item.images)
    ? (item.images as Array<Record<string, unknown>>)
    : [item.dishImage, item.restaurantImage, item.environmentImage]
        .filter(Boolean)
        .map((file) => ({ file }) as Record<string, unknown>);
  const foodImages = orderedGalleryImages(normalizedRows.map((row, index) => {
      const file = row.file;
      const metadata = sourceRows.find((row) => row.file === file);
      return normalizeGalleryImage({
      file: textValue(file),
      caption: textValue(row.caption || metadata?.caption,
        index === 0 ? `${textValue(item.name)}实景` : `${textValue(item.name)}环境`,
      ),
      title: textValue(row.title || metadata?.title || row.caption || metadata?.caption || item.name),
      source: textValue(row.source || metadata?.source || item.source),
      sourcePage: textValue(row.sourcePage || metadata?.sourcePage || item.source),
      role: textValue(row.role || metadata?.role || (index === 0 ? 'cover' : 'interior')),
      entityId: textValue(row.entityId || metadata?.entityId || item.id),
      lastVerified: textValue(row.lastVerified || metadata?.lastVerified || item.lastVerified),
      isCover: Boolean(row.isCover),
      priority: Number(row.priority ?? index + 1),
      status: 'verified',
      }, { entityId: textValue(item.id), title: textValue(item.name), source: textValue(item.source), lastVerified: textValue(item.lastVerified) });
    }));
  return {
    id: textValue(item.id),
    type:
      textValue(item.category) === 'Cafe' ||
      textValue(item.category) === 'Dessert'
        ? 'cafe'
        : 'restaurant',
    name: textValue(item.name),
    city: textValue(item.city),
    address: textValue(item.address || '待确认'),
    mapQuery: textValue(item.mapQuery),
    coordinates: null,
    images: foodImages,
    description: textValue(item.dishes),
    priceLabel: textValue(item.price),
    projectedCostCny: null,
    openingHours: textValue(item.hours),
    links: {
      source: textValue(item.source),
      menu: menu?.url ? textValue(menu.url) : null,
    },
    source: textValue(item.source),
    lastVerified: textValue(item.lastVerified),
    tags: [textValue(item.category), textValue(item.meal)],
    notes: textValue(item.reservation),
    raw: item,
  };
});

const gymEntities: Entity[] = (gyms as Array<Record<string, unknown>>).map(
  (item) => ({
    id: textValue(item.id),
    type: 'gym',
    name: textValue(item.name),
    city: textValue(item.city),
    address: '待确认',
    mapQuery: textValue(item.name),
    coordinates: null,
    images: orderedGalleryImages((Array.isArray(item.images)
      ? (item.images as Array<Record<string, unknown>>)
      : item.image
        ? [{ file: item.image, role: 'equipment', title: `${textValue(item.name)}力量区`, isCover: true, priority: 1 }]
        : []).map((image) => normalizeGalleryImage({
          file: textValue(image.file),
          caption: textValue(image.caption || image.title || `${textValue(item.name)}训练环境`),
          title: textValue(image.title || image.caption || `${textValue(item.name)}训练环境`),
          role: textValue(image.role || 'equipment'),
          source: textValue(image.source || item.source),
          sourcePage: textValue(image.sourcePage || item.source),
          lastVerified: textValue(image.lastVerified || item.verifiedAt || '2026-09-06'),
          entityId: textValue(item.id),
          isCover: Boolean(image.isCover),
          priority: Number(image.priority ?? 99),
          status: 'verified',
        }, { entityId: textValue(item.id), title: textValue(item.name), source: textValue(item.source), lastVerified: textValue(item.verifiedAt || '2026-09-06') }))),
    description: `${textValue(item.style)} · ${textValue(item.equipment)}`,
    priceLabel: textValue(item.dayPass),
    projectedCostCny: null,
    openingHours: textValue(item.hours),
    links: { source: textValue(item.source) },
    source: textValue(item.source),
    lastVerified: '2026-09-06',
    tags: ['gym', textValue(item.tag)],
    notes: textValue(item.photo),
    raw: item,
  }),
);

const shoppingEntities: Entity[] = (
  shopping as Array<Record<string, unknown>>
).map((item) => ({
  id: textValue(item.id),
  type: 'shopping',
  name: textValue(item.name),
  city: textValue(item.city),
  address: '待确认',
  mapQuery: textValue(item.mapQuery),
  coordinates: null,
  images: [],
  description: textValue(item.kind),
  priceLabel: '按现场消费',
  projectedCostCny: null,
  openingHours: textValue(item.hours),
  links: { source: textValue(item.source) },
  source: textValue(item.source),
  lastVerified: textValue(item.verifiedAt),
  tags: ['shopping', textValue(item.kind)],
  notes: textValue(item.routeFit),
  raw: item,
}));

const activityEntities: Entity[] = (
  activities as Array<Record<string, unknown>>
).map((item) => ({
  id: textValue(item.id),
  type: 'activity',
  name: textValue(item.name),
  city: textValue(item.city),
  address: textValue(item.address),
  mapQuery: textValue(item.name),
  coordinates: null,
  images: [],
  description: textValue(item.description),
  priceLabel: '不适用',
  projectedCostCny: null,
  openingHours: textValue(item.openingHours),
  links: {},
  source: textValue(item.source),
  lastVerified: textValue(item.lastVerified),
  tags: item.tags as string[],
  notes: textValue(item.notes),
  raw: item,
}));

const confirmedHotels = hotelBookings.items as Array<{
  id: string;
  city: string;
  hotelName: string;
  execution: { address: string };
}>;
const hotelForEntity = (entity: Entity) =>
  confirmedHotels.find((stay) => stay.city === normalizeRouteCity(entity.city));
const addHotelAnchor = (entity: Entity): Entity => {
  const stay = hotelForEntity(entity);
  if (!stay) return entity;
  const destination =
    entity.address && !entity.address.includes('待确认')
      ? entity.address
      : entity.mapQuery || entity.name;
  return {
    ...entity,
    hotelAnchor: {
      id: stay.id,
      name: stay.hotelName,
      address: stay.execution.address,
      directionsUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(stay.execution.address)}&destination=${encodeURIComponent(destination)}&travelmode=transit`,
    },
  };
};

export const entityLibrary: Entity[] = [
  ...placeEntities,
  ...optionEntities,
  ...foodEntities,
  ...gymEntities,
  ...shoppingEntities,
  ...activityEntities,
].map(addHotelAnchor);
export const entityMap = new Map(
  entityLibrary.map((entity) => [entity.id, entity]),
);

export function normalizeRouteCity(city: string) {
  if (city.includes('梵蒂冈')) return '罗马';
  if (city.includes('Mestre')) return '威尼斯';
  return city.split(' → ').at(-1) ?? city;
}
