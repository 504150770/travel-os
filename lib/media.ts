export type GalleryImage = {
  file: string;
  role: string;
  title: string;
  caption: string;
  source: string | null;
  sourcePage: string | null;
  lastVerified: string | null;
  isCover: boolean;
  priority: number;
  entityId?: string;
  status?: string;
  bestTime?: string;
  composition?: string;
  matchesDishes?: string[];
};

export type GalleryRequest = {
  entityId: string;
  name: string;
  images: GalleryImage[];
  index: number;
};

const roleOrder: Record<string, number> = {
  cover: 0,
  dish: 1,
  equipment: 1,
  room: 1,
  overview: 1,
  hero: 1,
  stop: 1,
  interior: 2,
  exterior: 3,
  entrance: 4,
  bathroom: 5,
  'photo-angle': 6,
  detail: 7,
};

export function normalizeGalleryImage(
  image: Partial<GalleryImage> & Pick<GalleryImage, 'file'>,
  fallback: { entityId: string; title: string; source?: string; lastVerified?: string },
): GalleryImage {
  const role = String(image.role || 'detail').toLowerCase();
  return {
    file: image.file,
    role,
    title: image.title || image.caption || fallback.title,
    caption: image.caption || image.title || fallback.title,
    source: image.source || fallback.source || null,
    sourcePage: image.sourcePage || image.source || fallback.source || null,
    lastVerified: image.lastVerified || fallback.lastVerified || null,
    isCover: Boolean(image.isCover),
    priority: Number.isFinite(image.priority) ? Number(image.priority) : 99,
    entityId: image.entityId || fallback.entityId,
    status: image.status,
    bestTime: image.bestTime,
    composition: image.composition,
    matchesDishes: image.matchesDishes,
  };
}

export function orderedGalleryImages(images: GalleryImage[]) {
  return [...images].sort(
    (a, b) =>
      Number(b.isCover) - Number(a.isCover) ||
      (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99) ||
      a.priority - b.priority,
  );
}

export function selectCoverImage(images: GalleryImage[]) {
  return orderedGalleryImages(images)[0];
}

export function openGalleryRequest(
  entityId: string,
  name: string,
  images: GalleryImage[],
  selected?: GalleryImage,
): GalleryRequest {
  const ordered = orderedGalleryImages(images);
  const index = selected
    ? Math.max(0, ordered.findIndex((image) => image.file === selected.file))
    : 0;
  return { entityId, name, images: ordered, index };
}
