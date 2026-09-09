import places from '@/data/places.json';
import restaurants from '@/data/restaurants.json';
import gyms from '@/data/gyms.json';
import options from '@/data/options.json';
import activities from '@/data/activities.json';
import images from '@/data/images.json';
import shopping from '@/data/shopping.json';
import hotelBookings from '@/data/hotel-bookings.json';

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
export type EntityImage = {
  file: string;
  caption: string;
  source: string | null;
  lastVerified: string | null;
  status: string;
  bestTime?: string;
  composition?: string;
};
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
  imageRows
    .filter((item) => item.placeId === placeId)
    .map((item) => ({
      file: textValue(item.file),
      caption: textValue(item.caption),
      source: textValue(item.sourcePage || '') || null,
      lastVerified: textValue(item.lastVerified || '') || null,
      status: 'verified',
      bestTime: textValue(item.bestTime, '待确认'),
      composition: textValue(item.composition, '待确认'),
    }));

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
  const foodImages = [
    item.dishImage,
    item.restaurantImage,
    item.environmentImage,
  ]
    .filter(Boolean)
    .map((file, index) => ({
      file: textValue(file),
      caption:
        index === 0
          ? `${textValue(item.name)}代表菜`
          : `${textValue(item.name)}环境`,
      source: textValue(item.source),
      lastVerified: textValue(item.lastVerified),
      status: 'verified',
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
    images: item.image
      ? [
          {
            file: textValue(item.image),
            caption: `${textValue(item.name)}力量区`,
            source: textValue(item.source),
            lastVerified: '2026-09-06',
            status: 'verified',
          },
        ]
      : [],
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
