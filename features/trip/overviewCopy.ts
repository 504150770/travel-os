import type { Entity } from '../../lib/entity-library';

// Describe the planned visit, not the cover photo's source metadata.
// The full notes and image attribution remain available in existing details/Gallery.
export function placeOverviewCopy(
  entity: Pick<Entity, 'description' | 'notes'>,
  planNotes = '',
) {
  return [planNotes, entity.description, entity.notes]
    .map((value) => value.trim())
    .find(Boolean) || '查看地点详情与票务信息';
}
