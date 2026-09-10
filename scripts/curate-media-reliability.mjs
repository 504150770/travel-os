import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const files = ['images.json', 'hotel-bookings.json', 'restaurants.json', 'gyms.json', 'shopping.json'];
const read = (file) => JSON.parse(readFileSync(join(root, 'data', file), 'utf8'));
const data = Object.fromEntries(files.map((file) => [file, read(file)]));
const labels = new Map([
  ['commons.wikimedia.org', 'Wikimedia Commons'], ['upload.wikimedia.org', 'Wikimedia Commons'],
  ['cntraveler.com', 'Condé Nast Traveler'], ['happycow.net', 'HappyCow'], ['restaurantguru.com', 'Restaurant Guru'], ['restaurantguru.it', 'Restaurant Guru'],
  ['unsplash.com', 'Unsplash'], ['yelp.com', 'Yelp'], ['trip.com', 'Trip.com'], ['thefork.com', 'TheFork'], ['thefork.at', 'TheFork'], ['thefork.ch', 'TheFork'],
  ['wolt.com', 'Wolt Business Menu'], ['masalledesport.com', 'Ma Salle de Sport'], ['tripadvisor.com', 'Tripadvisor'], ['sluurpy.it', 'Sluurpy'],
  ['firenzemadeintuscany.com', 'Firenze Made in Tuscany'], ['palestre.fitness', 'Palestre.Fitness venue listing'], ['icioncuisine.com', 'Ici On Cuisine venue listing'],
  ['lonelyplanet.com', 'Lonely Planet'], ['vogue.fr', 'Vogue France'], ['theinfatuation.com', 'The Infatuation'], ['twitter.com', 'Venue-specific social post'],
  ['waug.com', 'WAUG'], ['autoreserve.com', 'AutoReserve'], ['corner.inc', 'Corner venue guide'], ['note.com', 'Venue-specific editorial'],
]);
const hostname = (value) => { try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return ''; } };
const thirdPartyLabel = (host) => {
  for (const [domain, label] of labels) if (host === domain || host.endsWith(`.${domain}`)) return label;
  return null;
};
const corrected = [];
const clean = (image) => {
  const host = hostname(image.sourcePage);
  let source = image.source;
  const known = thirdPartyLabel(host);
  if (known) source = known;
  else if (!host && String(image.sourcePage || '').startsWith('本地来源')) source = 'Local Visual Source';
  else if (host && /official|官网/i.test(String(source || ''))) source = 'Official Website';
  if (source && source !== image.source) {
    corrected.push({ entityId: image.entityId || image.placeId || null, file: image.file, from: image.source || null, to: source, sourcePage: image.sourcePage || null });
    image.source = source;
  }
};
const visit = (row) => {
  if (Array.isArray(row)) return row.forEach(visit);
  if (!row || typeof row !== 'object') return;
  if (row.file && (row.sourcePage || row.source)) clean(row);
  for (const value of Object.values(row)) if (value && typeof value === 'object') visit(value);
};
for (const value of Object.values(data)) visit(value);

const matches = new Map(Object.entries({
  'rome-armando|Carbonara': ['Carbonara'], 'rome-roscioli|Carbonara': ['Carbonara'], 'rome-roscioli|Cacio e pepe': ['Cacio e pepe'],
  'rome-trapizzino|Pollo alla cacciatora Trapizzino': ['Pollo alla cacciatora Trapizzino'], 'rome-santeustachio|Gran Caffè and hot chocolate': ['Gran Caffè'],
  'florence-sabatino|Meat stew and roast potatoes': ['炖肉'], 'florence-ditta|Avocado toast and flat white': ['Flat white'],
  'venice-viterossa|Seafood pasta': ['海鲜', '鲜意面'], 'venice-viterossa|Cicchetti display counter': ['Cicchetti'],
  'prague-kantyna|Czech beef plate': ['捷克牛肉'], 'prague-eska|Bread and fermentation bakery': ['发酵与烘焙'],
  'paris-breizh|Buckwheat galette': ['荞麦可丽饼'], 'paris-breizh|Galette and cider': ['苹果酒'], 'paris-flore|Café crème': ['Café crème'],
  'rome-forno|Bread, pizza and pastry counter': ['烘焙'], 'rome-giolitti|Gelato display': ['Gelato'],
  'florence-cammillo|Baked Tuscan pasta': ['Tuscan pasta'], 'florence-gustapizza|Margherita and Gusta pizza': ['现烤披萨'],
  'venice-plip|Veneto seasonal dish': ['Veneto seasonal dishes'], 'venice-frarys|Falafel and hummus mezze': ['地中海与中东菜'],
  'venice-torrefazione|Espresso service': ['Espresso'], 'vienna-central|Viennese cake and coffee': ['Viennese coffee', '蛋糕'],
  'vienna-demel|Demel confection': ['糕点'], 'vienna-plachutta|Tafelspitz': ['Tafelspitz'], 'prague-savoy|Savoy dining selection': ['捷克早餐'],
  'prague-choco|Hot chocolate and cheesecake': ['热巧克力', '蛋糕'], 'paris-angelina|Mont-Blanc and hot chocolate': ['Mont-Blanc', '热巧克力'],
  'paris-dupain|Chocolate pistachio escargot': ['Escargot pastry'], 'paris-dupain|Historic boulangerie facade': ['面包'],
  'paris-stohrer|Rum baba': ['Rum baba'], 'paris-stohrer|Stohrer pastry selection': ['法式糕点'],
  'paris-enfants|Tomato and seafood plate': ['市场海鲜'], 'venice-ai-pini-restaurant|Seasonal seafood main': ['海鲜'],
  'vienna-tarim|Qorulghan Lagmen': ['手工拉面'],
}));
for (const restaurant of data['restaurants.json']) for (const image of restaurant.images || []) {
  const value = matches.get(`${restaurant.id}|${image.title || image.caption}`);
  if (value) image.matchesDishes = value;
}

for (const file of files) writeFileSync(join(root, 'data', file), `${JSON.stringify(data[file], null, 2)}\n`);
let previous = { corrected: [] };
try { previous = JSON.parse(readFileSync(join(root, 'audit', 'provenance-cleanup.json'), 'utf8')); } catch { /* first run */ }
const combined = [...new Map([...(previous.corrected || []), ...corrected].map((item) => [`${item.entityId}|${item.file}|${item.from}|${item.to}`, item])).values()];
writeFileSync(join(root, 'audit', 'provenance-cleanup.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), correctedCount: combined.length, corrected: combined }, null, 2)}\n`);
console.log(JSON.stringify({ sourceCorrectionsThisRun: corrected.length, sourceCorrectionsTotal: combined.length, explicitDishMappings: matches.size }, null, 2));
