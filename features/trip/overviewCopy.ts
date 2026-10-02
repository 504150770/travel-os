import type { Entity } from '../../lib/entity-library';

const defaultVisitCopy: Record<string, { source: string; display: string }> = {
  trocadero: {
    source: 'Eiffel Tower panoramic views / photos。',
    display: '埃菲尔铁塔全景视角 / 拍照',
  },
  eiffel: {
    source: 'Exterior / close-up visit. No tower ascent.',
    display: '外观近距离参观，不登塔',
  },
  arc_triomphe: {
    source: 'Ascent optional depending on weather；不把登顶设为必做。',
    display: '登顶按天气决定，不设为必做',
  },
};

// Describe the planned visit, not the cover photo's source metadata.
// The full notes and image attribution remain available in existing details/Gallery.
export function placeOverviewCopy(
  entity: Pick<Entity, 'description' | 'notes'> & Partial<Pick<Entity, 'id'>>,
  planNotes = '',
) {
  const defaultCopy = entity.id ? defaultVisitCopy[entity.id] : undefined;
  // Translate only the exact built-in note for this entity; edited notes stay as entered.
  if (defaultCopy && planNotes === defaultCopy.source) return defaultCopy.display;
  return [planNotes, entity.description, entity.notes]
    .map((value) => value.trim())
    .find(Boolean) || '查看地点详情与票务信息';
}
