import assert from 'node:assert/strict';
import {
  derivePlanDisplayStatusFromInput,
  supportingPlanLabel,
  isSightseeingEntity,
} from '../features/trip/planStatusModel.ts';
import { ticketBookingByEntity } from '../features/trip/bookingEntityMap.ts';
import { placeOverviewCopy } from '../features/trip/overviewCopy.ts';
import fs from 'node:fs';

// Presentation-only copy: live plan notes win; no cover attribution fallback.
assert.equal(placeOverviewCopy({ description: '', notes: '' }, 'Exterior / close-up visit. No tower ascent.'), 'Exterior / close-up visit. No tower ascent.');
assert.equal(placeOverviewCopy({ description: '地点说明', notes: '实体备注' }, ' 当天用户备注 '), '当天用户备注');
assert.equal(placeOverviewCopy({ description: '地点说明', notes: '实体备注' }, '   '), '地点说明');
assert.equal(placeOverviewCopy({ description: '', notes: '实体备注' }), '实体备注');
assert.equal(placeOverviewCopy({ description: '', notes: '' }), '查看地点详情与票务信息');
const day15Notes = JSON.parse(fs.readFileSync(new URL('../data/day-plans.json', import.meta.url), 'utf8')).days.find((day) => day.dayId === 15).activeItems;
for (const [id, display] of [
  ['trocadero', '埃菲尔铁塔全景视角 / 拍照'],
  ['eiffel', '外观近距离参观，不登塔'],
  ['arc_triomphe', '登顶按天气决定，不设为必做'],
]) {
  const note = day15Notes.find((item) => item.entityId === id).notes;
  const entity = { id, description: '', notes: '' };
  assert.equal(placeOverviewCopy(entity, note), display);
  assert.equal(placeOverviewCopy(entity, `${note} My own note`), `${note} My own note`);
  assert.equal(placeOverviewCopy({ ...entity, id: 'custom-place' }, note), note);
}

const status = (overrides = {}) => derivePlanDisplayStatusFromInput({
  ticketState: '',
  itemTicket: '',
  entityType: 'place',
  context: '',
  hasBooking: false,
  ...overrides,
});

assert.equal(status({ ticketState: 'Ticketed' }), 'fixed');
assert.equal(status({ ticketState: 'Research', itemTicket: '临近放票再买', hasBooking: true }), 'to-book');
assert.equal(status({ ticketState: 'Research', itemTicket: '无票', hasBooking: true }), 'core');
assert.equal(status({ itemTicket: '现场即可', entityType: 'activity', context: '长午餐与咖啡' }), 'core');
assert.equal(status({ itemTicket: '现场决定', context: '天气好再决定是否登顶', hasBooking: true }), 'flex');
assert.equal(status({ entityType: 'gym', context: '健身推荐' }), 'flex');
assert.equal(supportingPlanLabel('core', '现场即可', 'activity', '长午餐与咖啡'), '恢复时段');

assert.equal(isSightseeingEntity({ type: 'place', raw: { type: 'transport' } }), false);
assert.equal(isSightseeingEntity({ type: 'place', raw: { type: 'museum' } }), true);
assert.equal(isSightseeingEntity({ type: 'place', raw: { type: 'sight' } }), true);
assert.equal(isSightseeingEntity({ type: 'place', raw: {} }), true);
assert.equal(isSightseeingEntity({ type: 'activity', raw: {} }), false);

assert.equal(ticketBookingByEntity['activity-d1-01'], 'flight-can-fco');
assert.equal(ticketBookingByEntity['activity-d5-01'], 'train-rome-florence');
assert.equal(ticketBookingByEntity['activity-d7-01'], 'train-florence-venice');
assert.equal(ticketBookingByEntity['activity-d9-01'], 'flight-vce-vie');
assert.equal(ticketBookingByEntity['activity-d11-01'], 'railjet-vie-prg');
assert.equal(ticketBookingByEntity['activity-d13-01'], 'flight-prg-par');
assert.equal(ticketBookingByEntity.cdg, 'flight-cdg-can');
assert.equal(ticketBookingByEntity['activity-d17-03'], 'flight-cdg-can');

console.log('Trip presentation tests passed: Fixed, To Book, Core and Flex rules remain distinct.');
