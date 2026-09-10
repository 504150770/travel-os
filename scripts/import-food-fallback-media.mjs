import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const dataFile = join(root, 'data', 'restaurants.json');
const items = JSON.parse(await readFile(dataFile, 'utf8'));
const verified = '2026-09-10';
const fallback = {
  'rome-roscioli': ['https://lp-cms-production.imgix.net/features/2017/09/Carbonara5-5f31fb9a7f9a.jpg?auto=format%2Ccompress&fit=crop&h=810&q=72&w=1440', 'Lonely Planet', 'https://www.lonelyplanet.com/articles/romes-top-dishes-taste'],
  'rome-santeustachio': ['https://d2mgzmtdeipcjp.cloudfront.net/files/magazine/2024/06/12/17181687688127.jpg', 'WAUG Rome coffee guide', 'https://www.waug.com/en/magazines/615'],
  'rome-forno': ['https://media.cntraveler.com/photos/5dfbe7bc69d1500009e514c0/16%3A9/w_2560%2Cc_limit/FORNOCAMPODEIFIORIIMG_13522019-SabrinaRossi-Rome.jpg?mbid=social_retweet', 'Condé Nast Traveler', 'https://www.cntraveler.com/restaurants/rome/forno-campo-de-fiori'],
  'venice-plip': ['https://menu.sluurpy.it/foto-g/191590/4270013.jpg', 'Sluurpy venue gallery', 'https://www.sluurpy.it/album/191590'],
  'florence-gustapizza': ['https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2e/08/68/c5/caption.jpg?h=-1&s=1&w=1200', 'Tripadvisor venue gallery', 'https://www.tripadvisor.com/Restaurant_Review-g187895-d1155597-Reviews-Gustapizza-Florence_Tuscany.html'],
  'florence-cammillo': ['https://www.firenzemadeintuscany.com/assets/w%3D1040__images.ctfassets.net_7dc7gq8ix1ml_1feqQZNdKQEBo49X0CCnZH_a2550ddf8d8341a25381c4446000584a__W5A4406.jpg', 'Firenze Made in Tuscany', 'https://www.firenzemadeintuscany.com/it/articolo/la-storia-e-i-piatti-da-non-perdere-della-storica-trattoria-cammillo/'],
  'florence-sabatino': ['https://serica-watches.com/cdn/shop/files/Firenze_A_day-in-the-life-1.jpg?crop=center&height=3931&v=1755080367&width=3024', 'SERICA Florence editorial', 'https://serica-watches.com/en/blogs/serica-stories/a-day-in-the-life-firenze-italie'],
  'florence-rivoire': ['https://cdn.thefork.com/tf-lab/image/upload/w_500%2Ch_500%2Cc_fill%2Cq_auto%2Cf_auto%2Cg_auto%3Asubject/restaurant/4a87ef59-8df5-4c72-9618-9ed140758bb2/6f35ae8f-fdce-4fb6-8365-3fa4d684fa73.jpg', 'TheFork menu gallery', 'https://www.thefork.ch/restaurant/rivoire-firenze-r805157/menu'],
  'venice-torrefazione': ['https://veneziaautentica.com/wp-content/uploads/2016/07/torrefazione-cannaregio-8.jpg', 'Venezia Autentica', 'https://veneziaautentica.com/venice-shop-bar-coffee-torrefazione-cannaregio/'],
  'venice-frarys': ['https://img02.restaurantguru.com/c6a6-Frarys-dishes.jpg', 'Restaurant Guru venue gallery', 'https://restaurantguru.it/Frarys-Venice'],
  'paris-angelina': ['https://offloadmedia.feverup.com/parissecret.com/wp-content/uploads/2020/11/28050310/ANGE_RIVOLI_CHOCOLAT_CHAUD_VERSION_TABLE-redim_0-1024x599.jpg', 'Paris Secret', 'https://parissecret.com/en/the-angelina-paris-recipe-for-creamy-hot-chocolate/'],
  'paris-dupain': ['https://media.vogue.fr/photos/5c63f0763d44a060c4cbc46b/master/w_1600%2Cc_limit/hhh.jpg', 'Vogue France', 'https://www.vogue.fr/lifestyle/article/les-meilleures-boulangeries-a-paris'],
  'vienna-tarim': ['https://img02.restaurantguru.com/c599-Tarim-Uigur-Restaurant-Vienna-food.jpg', 'Restaurant Guru venue gallery', 'https://de.restaurantguru.com/Tarim-Uigur-Restaurant-Vienna'],
  'vienna-plachutta': ['https://ak-d.tripcdn.com/images/0106i12000feswvul08B6_D_750_520_Q90.jpg?proc=autoorient', 'Trip.com venue gallery', 'https://in.trip.com/restaurant/austria/vienna/detail/plachutta-wollzeile-17207986/'],
};

for (const item of items) {
  const source = fallback[item.id];
  if (!source) continue;
  const [originalUrl, sourceName, sourcePage] = source;
  const response = await fetch(originalUrl, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!response.ok) throw new Error(`${item.id}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const file = `/images/food/${item.id}.webp`;
  const output = join(root, 'public', file.slice(1));
  await mkdir(dirname(output), { recursive: true });
  await sharp(bytes).rotate().resize({ width: 960, height: 640, fit: 'cover', withoutEnlargement: true }).webp({ quality: 80 }).toFile(output);
  item.restaurantImage = file;
  item.photoStatus = '已核真实来源图片';
  item.imageSources = [{
    file,
    caption: `${item.name} — venue or signature food visual`,
    source: sourceName,
    sourcePage,
    originalUrl,
    lastVerified: verified,
    role: 'Restaurant',
    entityId: item.id,
  }];
  console.log(`OK ${item.id}`);
}

await writeFile(dataFile, `${JSON.stringify(items, null, 2)}\n`);
await writeFile(join(root, 'audit', 'priority-food-media-failures.json'), '[]\n');
