import assert from 'node:assert/strict';
import { createBackupImportSession } from '../features/app/backupImportSession.ts';

let state;
const reviewed = { version: 5, marker: 'newer selection' };
const older = { version: 4, marker: 'older selection' };
const restored = [];
const session = createBackupImportSession(text => {
  if (text === 'broken') throw new Error('Invalid backup');
  return text === 'new' ? reviewed : older;
}, next => { state = next; });
let resolveOld;
const oldRead = session.select({ text: () => new Promise(resolve => { resolveOld = resolve; }) });
await session.select({ text: async () => 'new' });
assert.equal(state.phase, 'review');
assert.equal(state.data, reviewed);
assert.equal(restored.length, 0, 'Selecting a file must never write storage');
resolveOld('old');
await oldRead;
assert.equal(state.data, reviewed, 'An older slow read cannot replace the reviewed snapshot');
session.confirm(data => restored.push(data));
session.confirm(data => restored.push(data));
assert.deepEqual(restored, [reviewed], 'Repeated confirmation writes exactly once');
assert.equal(state.phase, 'done');

let resolveCancelled;
const cancelledRead = session.select({ text: () => new Promise(resolve => { resolveCancelled = resolve; }) });
session.cancel();
resolveCancelled('old');
await cancelledRead;
assert.equal(state.phase, 'idle');
session.confirm(data => restored.push(data));
assert.equal(restored.length, 1, 'Cancellation cannot import an in-flight file');

await session.select({ text: async () => 'new' });
session.confirm(() => { throw new Error('Quota failed; rollback complete'); });
assert.equal(state.phase, 'review');
assert.equal(state.data, reviewed);
assert.match(state.error, /rollback complete/);
session.cancel();
assert.equal(state.data, null);

await session.select({ text: async () => 'new' });
await session.select({ text: async () => 'broken' });
assert.equal(state.data, null, 'Rejected replacement must clear the old preview');
assert.equal(state.phase, 'idle');
assert.match(state.error, /Invalid backup/);
session.confirm(data => restored.push(data));
assert.equal(restored.length, 1);

let rejectOld;
const oldFailure = session.select({ text: () => new Promise((_, reject) => { rejectOld = reject; }) });
await session.select({ text: async () => 'new' });
rejectOld(new Error('Slow obsolete failure'));
await oldFailure;
assert.equal(state.data, reviewed);
assert.equal(state.error, '');
session.confirm(data => {
  session.confirm(() => { throw new Error('Reentrant restore'); });
  restored.push(data);
});
assert.deepEqual(restored, [reviewed, reviewed]);
console.log('Backup import session tests passed: review-before-write, exact snapshot, selection races, cancellation, duplicate confirmation and retry after failure.');
