import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const verified = '2026-09-10';
const restaurantsPath = join(root, 'data', 'restaurants.json');
const gymsPath = join(root, 'data', 'gyms.json');
const restaurants = JSON.parse(await readFile(restaurantsPath, 'utf8'));
const gyms = JSON.parse(await readFile(gymsPath, 'utf8'));

const specs = {
  'rome-armando': [[1,'entrance','Armando entrance and team'],[2,'dish','Roman pasta special'],[4,'dish','Carbonara'],[5,'interior','Kitchen and service context']],
  'rome-roscioli': [[1,'dish','Carbonara']],
  'rome-trapizzino': [[1,'dish','Trapizzino tasting spread'],[2,'dish','Pollo alla cacciatora Trapizzino'],[3,'dish','Trapizzino selection'],[4,'entrance','Trastevere counter']],
  'rome-santeustachio': [[1,'exterior','Sant’Eustachio street setting'],[2,'entrance','Sant’Eustachio entrance'],[4,'interior','Historic coffee bar interior']],
  'rome-forno': [[1,'entrance','Forno Campo de’ Fiori entrance'],[2,'interior','Baker at work'],[3,'dish','Pizza bianca'],[5,'interior','Bread and pastry display']],
  'rome-giolitti': [[1,'dish','Giolitti dessert'],[2,'dish','Gelato display'],[4,'interior','Historic café interior'],[5,'dish','Gelato selection']],
  'florence-sabatino': [[1,'entrance','Trattoria Sabatino entrance'],[2,'detail','Daily menu board']],
  'florence-ditta': [],
  'florence-cammillo': [[1,'entrance','Cammillo entrance'],[2,'interior','Main dining room'],[3,'interior','Dining room angle'],[4,'interior','Wine and dining room']],
  'florence-gustapizza': [[1,'dish','Gustapizza selection']],
  'florence-rivoire': [[1,'dish','Rivoire plated dish'],[3,'dish','Chocolate selection'],[4,'dish','Rivoire café cocktail'],[5,'dish','Chocolate preparation']],
  'venice-viterossa': [[1,'dish','Seafood pasta']],
  'venice-florian': [[1,'interior','Historic Florian room'],[2,'dish','Coffee and biscuits'],[3,'interior','Café service room']],
  'venice-plip': [[1,'dish','Veneto seasonal dish']],
  'venice-frarys': [[1,'dish','Mediterranean tasting spread']],
  'venice-torrefazione': [[1,'interior','Coffee roastery interior']],
  'venice-ai-pini-restaurant': [[4,'interior','Chef and garden service'],[5,'dish','Seasonal seafood main']],
  'vienna-kameel': [[1,'interior','Zum Schwarzen Kameel counter'],[3,'dish','Viennese coffee'],[4,'interior','Terrace seating'],[5,'dish','Pastry display']],
  'vienna-central': [[1,'exterior','Café Central facade'],[2,'entrance','Palais Ferstel entrance']],
  'vienna-demel': [[1,'interior','Demel display room'],[3,'dish','Demel confection'],[4,'dish','Chocolate cake'],[5,'dish','Gift confection']],
  'vienna-plachutta': [[1,'dish','Tafelspitz'],[2,'dish','Tafelspitz serving pot'],[3,'dish','Traditional Tafelspitz service'],[4,'entrance','Plachutta Wollzeile entrance'],[5,'interior','Dining room']],
  'vienna-tarim': [[1,'dish','Uyghur seasonal dish']],
  'prague-lokal': [[1,'interior','Lokál dining hall'],[2,'interior','Dining room angle'],[3,'interior','Service counter'],[4,'dish','Czech lunch spread'],[5,'entrance','Lokál Dlouhááá entrance']],
  'prague-kantyna': [[1,'dish','Czech beef plate'],[2,'interior','Butcher counter']],
  'prague-eska': [[1,'entrance','Eska entrance'],[2,'interior','Bakery café interior'],[3,'dish','Coffee service'],[4,'dish','Bread and fermentation bakery']],
  'prague-savoy': [[1,'interior','Café Savoy dining room'],[3,'interior','Historic service bar'],[4,'dish','Czech schnitzel'],[5,'dish','Savoy dining selection']],
  'prague-choco': [[1,'interior','Choco Café seating'],[2,'dish','Chocolate cake']],
  'paris-breizh': [[1,'dish','Buckwheat galette'],[2,'dish','Galette and cider'],[4,'dish','Butter crêpe']],
  'paris-flore': [[1,'dish','Café crème'],[2,'entrance','Café de Flore entrance'],[3,'interior','Historic floor mosaic']],
  'paris-angelina': [[1,'dish','Mont-Blanc and hot chocolate'],[2,'dish','Angelina pastry selection'],[3,'dish','Chocolate cake'],[4,'dish','Seasonal pastry'],[5,'interior','Rivoli pastry display']],
  'paris-dupain': [[1,'entrance','Du Pain et des Idées corner'],[4,'exterior','Historic boulangerie facade']],
  'paris-stohrer': [[1,'dish','Stohrer pastry selection'],[3,'dish','Babas au rhum'],[5,'dish','Rum confection']],
  'paris-enfants': [[1,'dish','Seasonal market plate'],[3,'interior','Open kitchen'],[4,'dish','Tomato and seafood plate'],[5,'interior','Kitchen service']],
  'paris-la-table-de-mame': [[3,'interior','La Table de Mame dining room']],
};

const additions = {
  'rome-roscioli': [
    ['https://i0.wp.com/sundaychefs.com/wp-content/uploads/2019/12/roscioli-cacio-pepi-sunday-chefs-e1575571197500.jpeg?fit=2953%2C2923&ssl=1','dish','Cacio e pepe','https://sundaychefs.com/restaurant-reviews/roscioli-salumeria-con-cucina-rome-italy-review/','Sunday Chefs'],
    ['https://endoedibles.com/wp-content/uploads/2020/02/IMG_20200113_123107.jpg','interior','Salumeria dining room','https://endoedibles.com/?p=103719','Endo Edibles'],
    ['https://assets.st-note.com/img/1772160871-S9dE7CrIBpqUYDMlbZ6sV5Xj.jpg','entrance','Roscioli Salumeria entrance','https://note.com/dolcevitazu/n/nf70d451588af','Entity-specific editorial'],
  ],
  'rome-santeustachio': [
    ['https://www.hitherandthither.net/wp-content/uploads/2014/09/wpid26750-Hither-and-Thither-1.jpg','dish','Gran Caffè and hot chocolate','https://hitherandthither.net/santeustachio-il-caffe-rome-best-espresso/','Hither & Thither'],
  ],
  'florence-sabatino': [
    ['https://res.cloudinary.com/the-infatuation/image/upload/c_fill%2Cw_3840%2Car_4%3A3%2Cg_center%2Cf_auto/images/trattoriasabatino_sofiedelauw_florence13_qo90bh','dish','Tuscan meat and roast potatoes','https://www.theinfatuation.com/florence/neighborhoods/oltrarno','The Infatuation'],
    ['https://img3.restaurantguru.com/c770-Trattoria-Sabatino-Florence-dishes-3.jpg','dish','Meat stew and roast potatoes','https://restaurantguru.it/Trattoria-Sabatino-Florence','Restaurant Guru'],
    ['https://www.groovymashedpotatoes.com/content/images/2023/08/IMG_3512.jpg','interior','Traditional dining room','https://www.groovymashedpotatoes.com/7-days-in-florence-and-tuscany/','Travel editorial'],
  ],
  'florence-ditta': [
    ['https://images.happycow.net/venues/1024/28/98/hcmp289894_1726159.jpeg','dish','Avocado toast and flat white','https://www.happycow.net/reviews/ditta-artigianale-florence-289894','HappyCow'],
    ['https://cdn.corner.inc/place-photo/c5172751-52ab-4250-b007-2a292e4e65dd.jpeg','dish','Ditta latte','https://www.corner.inc/place/8745','Corner venue guide'],
    ['https://www.dolcevia.com/en/images/2024/restaurants/Ditta_Artiginale_2.jpg','interior','Ditta Artigianale café interior','https://www.dolcevia.com/en/articles/brunch-in-florence-where-to-go','Dolcevia'],
    ['https://img02.restaurantguru.com/cc8a-dessert-Ditta-Artigianale.jpg','dish','Brunch and dessert selection','https://restaurantguru.it/Ditta-Artigianale-Florence','Restaurant Guru'],
  ],
  'florence-cammillo': [
    ['https://cdn4.tuscanynowandmore.com/storage/app/media/uploaded-files/trattoria-camillo-img.jpg','dish','Steak and artichokes','https://www.tuscanynowandmore.com/discover-italy/best-food-italy/restaurant-guide-florence','Tuscany Now & More'],
    ['https://images.ctfassets.net/6alb7q886wpg/4m63AzJoRhUQwMnWXPqcH0/dbb1cb13e287ad509986f6a2d32b69dd/2.28.26_Winter_Food_Florence_body_5.png?fm=webp&q=75&w=1920','dish','Baked Tuscan pasta','https://priorworld.com/editorial/florence-in-winter-food','PRIOR editorial'],
  ],
  'florence-gustapizza': [
    ['https://uploads.grupodicas.com/2023/09/fachada-gusta-pizza-italia-florenca-e1693937090558.jpg','entrance','Gustapizza entrance','https://www.grupodicas.com/vida-noturna-em-florenca/','Travel editorial'],
    ['https://cdn.prod.rexby.com/image/e249d653eed5434b85b32f18d7661b1b?format=webp&height=1350&quality=80&width=1080','interior','Wood-fired oven','https://www.rexby.com/dramatically.expatic/ttd/delicious-wood-fired-pizza-in-florence','Rexby venue guide'],
    ['https://thereshegoesagain.org/wp-content/uploads/2022/02/Gustapizza_Florence_Italy.jpeg','dish','Margherita and Gusta pizza','https://thereshegoesagain.org/best-places-to-eat-in-florence-italy/','Travel editorial'],
  ],
  'venice-viterossa': [
    ['https://www.hostariaviterossa.it/media/formato3/antipasti-pesce.jpg','dish','Venetian seafood antipasti','https://www.hostariaviterossa.it/','Official restaurant website'],
    ['https://s3-media0.fl.yelpcdn.com/bphoto/sbP_AOyIizul87R68DmIFQ/o.jpg','dish','Seafood platter','https://www.yelp.com/biz/hostaria-vite-rossa-venezia','Yelp venue gallery'],
    ['https://i.autoreserve.com/thumb/800x800/restaurant_image/image/062/623/803/62623803/0f3c35ac-1838-4f96-9369-c933ecdbd62a%282%29.jpg?format=webp','interior','Cicchetti display counter','https://autoreserve.com/en/restaurants/CCXpBYu1n55M5bXC3b1b','AutoReserve venue gallery'],
  ],
  'venice-frarys': [
    ['https://www.frarysvenezia.it/img/ristorante/imm02_Big.jpg','entrance','Frary’s canal-side entrance','https://www.frarysvenezia.it/ristorante.html','Official restaurant website'],
    ['https://images.happycow.net/venues/1024/13/41/hcmp13415_1504113.jpeg','dish','Falafel and hummus mezze','https://www.happycow.net/reviews/frarys-venice-13415','HappyCow'],
    ['https://www.likealocalguide.com/_next/image?q=75&url=https%3A%2F%2Fdirectus.likealocalguide.com%2Fassets%2F291897ca-5c88-4e51-9dbd-b0478555cc0c&w=3840','interior','Canal-side dining room','https://www.likealocalguide.com/venice/frarys','Like A Local Guide'],
    ['https://visit-venice-italy.global.ssl.fastly.net/pics/restaurants/frarys-restaurant-venice-01.jpg?dpr=2&quality=70&width=616','dish','Mediterranean mezze platter','https://www.visit-venice-italy.com/restaurant/frarys-restaurant-venice.html','Visit Venice Italy'],
  ],
  'venice-torrefazione': [
    ['https://images.happycow.net/venues/1024/15/00/hcmp150036_798644.jpeg','entrance','Torrefazione Cannaregio entrance','https://www.happycow.net/reviews/torrefazione-cannaregio-venice-150036','HappyCow'],
    ['https://media.cntraveler.com/photos/5d767d976823450008ac0018/1%3A1/w_1024%2Cc_limit/Torrefazione-Cannaregio_Venice_%2525C2%2525A9FrancescoRusso_018.jpg','interior','Canal-side coffee room','https://www.cntraveler.com/bars/venice/torrefazione-cannaregio','Condé Nast Traveler'],
    ['https://media.cntraveler.com/photos/5d767d9765eba500080beb56/4%3A3/w_640%2Cc_limit/Torrefazione-Cannaregio_Venice_%25C2%25A9FrancescoRusso_017.jpg','dish','Espresso service','https://www.cntraveler.com/gallery/best-coffee-shops-in-venice','Condé Nast Traveler'],
    ['https://images.happycow.net/venues/1024/15/00/hcmp150036_718630.jpeg','dish','Cappuccino and jam tart','https://www.happycow.net/reviews/torrefazione-cannaregio-venice-150036?page=3','HappyCow'],
  ],
  'vienna-central': [
    ['https://static.wixstatic.com/media/452cc0_1e74b092836a402893ed22c57c26f0b6~mv2_d_5472_3648_s_4_2.jpg/v1/fill/w_980%2Ch_653%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/452cc0_1e74b092836a402893ed22c57c26f0b6~mv2_d_5472_3648_s_4_2.jpg','dish','Viennese cake and coffee','https://www.themunchingtraveller.com/post/cafehopping-in-vienna-cafe-central-wien','Travel editorial'],
    ['https://dry7pvlp22cox.cloudfront.net/mrt-images-prod/2023/09/27/aM1G/qdopY6DBEp.jpeg?quality=70.0&width=1080','dish','Coffee and chocolate cake','https://www.myrealtrip.com/community/posts/36885','Venue-specific travel post'],
    ['https://cdn.generationvoyage.fr/2024/03/Cafe-Central-a-Vienne.jpeg','interior','Grand café interior','https://generationvoyage.fr/cafes-traditionnels-viennois/','Generation Voyage'],
  ],
  'vienna-tarim': [
    ['https://imageproxy.wolt.com/assets/6929a98f4be0f0d2140f907b','dish','Qorulghan Lagmen','https://wolt.com/de-at/aut/vienna/restaurant/tarim-uigur-restaurant','Wolt business menu'],
    ['https://cdn.thefork.com/tf-lab/image/upload/w_640%2Cc_fill%2Cq_auto%2Cf_auto/customer/9281c5e0-edcf-4f1f-a819-ed9306f7b650/6ad80808-ee5a-459f-a9a3-48d4236d130c.jpg','dish','Spicy Uyghur noodle soup','https://www.thefork.com/restaurant/tarim-uigur-restaurant-r848723','TheFork venue gallery'],
    ['https://cdn.thefork.com/tf-lab/image/upload/w_1080%2Cc_fill%2Cq_auto%2Cf_auto/restaurant/9281c5e0-edcf-4f1f-a819-ed9306f7b650/2c5ac5ff-0423-42dc-8e26-aab6986e2069.jpg','interior','Tarim dining room','https://www.thefork.at/restaurant/tarim-uigur-restaurant-r848723','TheFork venue gallery'],
  ],
  'prague-kantyna': [
    ['https://blog.kakaocdn.net/dna/cLlp1b/btsGCW344k6/AAAAAAAAAAAAAAAAAAAAADcwMT0NLE2QJ2OjXmm6BLAHmjRUuuZkqURqvOPrqGwX/img.jpg?allow_ip=&allow_referer=&credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1777561199&signature=ls5v%2FlB1ERJInlFCj2ApX6LaxyU%3D','entrance','Kantýna entrance','https://paho1900.tistory.com/145','Venue-specific travel post'],
  ],
  'prague-choco': [
    ['https://img.restaurantguru.com/c8ee-Choco-Cafe-Prague-interior.jpg','interior','Choco Café pastry room','https://restaurantguru.com/Choco-Cafe-U-Cervene-zidle-Prague','Restaurant Guru'],
    ['https://pbs.twimg.com/media/FhNJQVAXgAEdEJW.jpg','dish','Hot chocolate and cheesecake','https://twitter.com/RebelRhyderXXX/status/1590695654191681536','Venue-specific social post'],
  ],
  'paris-flore': [
    ['https://p16-lemon8-va-sign.tiktokcdn-us.com/tos-maliva-v-ac5634-us/a695f84c94a445eabb84bcf0d3ad917e~tplv-tej9nj120t-text-logo%3AQHRyYXZlbGVlbl9ndXJs%3Aq75.jpeg?lk3s=c7f08e79&source=lemon8_seo&x-expires=1775412000&x-signature=IRMdSXj9HuiIr3qKFlioFM7pRXw%3D','dish','Croque monsieur','https://www.lemon8-app.com/%40traveleen_gurl/7219351550680957446?region=us','Venue-specific social post'],
  ],
  'paris-dupain': [
    ['https://i0.wp.com/jetsettimes.com/wp-content/uploads/2023/03/Escargot-chocolat-pistache-from-Du-Pains-et-des-Idees.jpg?ssl=1&w=640','dish','Chocolate pistachio escargot','https://jetsettimes.com/countries/france/paris/paris-foodie/12-mouthwatering-parisian-desserts-where-to-find-them/','Jetset Times'],
    ['https://www.mollyjwilk.com/wp-content/uploads/2022/06/IMG_1187-1024x683.jpg','dish','Pistachio escargot pastry','https://www.mollyjwilk.com/du-pain-et-des-idees/','Pastry editorial'],
  ],
  'paris-stohrer': [
    ['https://res.cloudinary.com/the-infatuation/image/upload/f_auto/q_auto/v1719515980/Stohrer_BabaAuRhum_WenkangShan_Paris_rvgj75.jpg','dish','Rum baba','https://www.theinfatuation.com/paris/guides/best-bakeries-paris','The Infatuation'],
    ['https://www.azureazure.com/files/Images/Bulletins/Gastronomy/stohrer/Stohner-01.jpg','interior','Historic pastry display','https://www.azureazure.com/gastronomy/stohrer-the-oldest-patisserie-bakery-in-paris/','AzureAzure'],
  ],
};

const download = async (item, row, index) => {
  const [url, role, title, sourcePage, source] = row;
  const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0', referer: sourcePage } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const file = `/images/food/${item.id}/curated-${String(index + 1).padStart(2, '0')}.webp`;
  const output = join(root, 'public', file.slice(1));
  await mkdir(dirname(output), { recursive: true });
  await sharp(bytes).rotate().resize({ width: 1100, height: 733, fit: 'cover', withoutEnlargement: true }).webp({ quality: 79 }).toFile(output);
  return { file, role, title, caption: `${item.name} · ${title}`, source, sourcePage, originalUrl: url, lastVerified: verified, isCover: false, priority: 50 + index, entityId: item.id };
};

for (const item of restaurants) {
  if (!specs[item.id]) continue;
  const original = item.images ?? [];
  const curated = specs[item.id].map(([number, role, title], index) => ({ ...original[number - 1], role, title, caption: `${item.name} · ${title}`, isCover: false, priority: index + 1 }));
  for (const [index, row] of (additions[item.id] ?? []).entries()) {
    try { curated.push(await download(item, row, index)); }
    catch (error) { console.warn(`SKIP ${item.id} ${row[2]}: ${error.message}`); }
  }
  const cover = curated.find((image) => image.role === 'dish') ?? curated[0];
  if (cover) cover.isCover = true;
  item.images = curated.map((image, index) => ({ ...image, priority: image === cover ? 1 : index + 2 }));
  if (cover) {
    item.restaurantImage = cover.file;
    item.dishImage = cover.role === 'dish' ? cover.file : item.dishImage;
  }
  item.imageSources = item.images;
  console.log(`${item.id}: ${item.images.length}`);
}

const gymAdditions = {
  'gym-rome-dabliu': [
    ['https://img3.restaurantguru.com/c5e3-Dabliu-Parioli-Fitness-Club-Rome-interior.jpg','interior','Parioli club interior','https://restaurantguru.com/Dabliu-Parioli-Fitness-Club-Rome','Restaurant Guru venue gallery'],
  ],
  'gym-paris-fpark': [
    ['https://datas.masalledesport.com/prod/place/12111/galerie/1636732725073.jpg','interior','Cardio and overall floor','https://www.masalledesport.com/salle/12111%2Cfitness-park-paris-porte-de-choisy%2Cclub-de-fitness%2Cparis%2C75013%2Cfr','Ma Salle de Sport'],
    ['https://cdns3.fitfit.fitness/fr/media/items/originals/746-Fitness-Park-Paris-Porte-de-Choisy-E8m4J.jpg','equipment','Cross-training and free-weight zone','https://sallesdesport.fitness/fr/i/746-fitness-park-paris-porte-de-choisy/','Venue listing'],
  ],
};
for (const item of gyms) {
  if (!gymAdditions[item.id]) continue;
  const current = item.images ?? [];
  for (const [index, row] of gymAdditions[item.id].entries()) {
    const [url, role, title, sourcePage, source] = row;
    try {
      const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0', referer: sourcePage } });
      if (!response.ok) throw new Error(`${response.status}`);
      const file = `/images/gym/${item.id}/curated-${index + 1}.webp`;
      const output = join(root, 'public', file.slice(1));
      await mkdir(dirname(output), { recursive: true });
      await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize({ width: 1100, height: 733, fit: 'cover', withoutEnlargement: true }).webp({ quality: 79 }).toFile(output);
      current.push({ file, role, title, caption: `${item.name} · ${title}`, source, sourcePage, originalUrl: url, lastVerified: verified, isCover: false, priority: current.length + 1, entityId: item.id });
    } catch (error) { console.warn(`SKIP ${item.id}: ${error.message}`); }
  }
  item.images = current;
}

await writeFile(restaurantsPath, `${JSON.stringify(restaurants, null, 2)}\n`);
await writeFile(gymsPath, `${JSON.stringify(gyms, null, 2)}\n`);
