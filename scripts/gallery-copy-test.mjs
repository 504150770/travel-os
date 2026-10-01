import assert from 'node:assert/strict';
import { galleryDisplayText } from '../lib/media.ts';

assert.equal(galleryDisplayText('Piazza San Marco title QS:P1476,en:"Piazza" label QS:Len,"Square"', '圣马可广场'), 'Piazza San Marco');
assert.equal(galleryDisplayText('Square label QS:Len,"Square"', 'fallback'), 'Square');
assert.equal(galleryDisplayText('Square QS:P1476,en:"Square"', 'fallback'), 'Square');
assert.equal(galleryDisplayText('   ', '圣马可广场'), '圣马可广场');
assert.equal(galleryDisplayText('Grand Foyer / ceiling detail', 'fallback'), 'Grand Foyer / ceiling detail');
console.log('Gallery display copy tests passed; source metadata unchanged.');
