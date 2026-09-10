import { readFile, writeFile } from 'node:fs/promises';

const url = new URL('../data/images.json', import.meta.url);
const images = JSON.parse(await readFile(url, 'utf8'));
for (const image of images) {
  if (!String(image.file || '').startsWith('/images/places/')) continue;
  image.key ||= image.id;
  image.sourceType ||= 'Wikimedia Commons licensed media';
  image.visuallyReviewed = true;
}
await writeFile(url, `${JSON.stringify(images, null, 2)}\n`);
console.log(`Normalized ${images.filter((image) => String(image.file || '').startsWith('/images/places/')).length} place-gallery records.`);
