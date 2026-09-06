import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(root, 'data', name), `${JSON.stringify(value, null, 2)}\n`);

const imagePlace = {
  'visual-02':'trevi','visual-03':'navona','visual-04':'colosseum','visual-05':'pantheon',
  'visual-06':'vatican_museums','visual-07':'st_peter','visual-08':'duomo_firenze','visual-09':'signoria',
  'visual-10':'piazzale_michelangelo','visual-11':'ponte_vecchio','visual-12':'grand_canal','visual-13':'accademia_bridge',
  'visual-14':'st_mark_square','visual-15':'st_mark_basilica','visual-16':null,'visual-17':'graben',
  'visual-18':'schonbrunn','visual-19':'rathausplatz','visual-20':'prague_old_town','visual-21':'prague_old_town',
  'visual-22':'prague_castle','visual-23':'charles_bridge','visual-24':'pont_saint_michel','visual-25':'pont_saint_michel',
  'visual-26':'louvre','visual-27':'louvre_pyramid','visual-28':'trocadero','visual-29':'arc_triomphe',
  'visual-30':'montmartre','visual-31':'galeries_lafayette','visual-32':'cdg','visual-01':null,'visual-33':null,
  'visual-34':'forum','visual-35':'oltrarno','visual-36':'bridge_sighs','visual-37':'st_vitus','visual-38':'mala_strana','visual-39':'sacre_coeur',
};
const typeFromUse = (use='') => use.includes('人物') ? 'portrait' : use.includes('室内') ? 'interior' : use.includes('细节') ? 'detail' : use.includes('夜') || use.includes('蓝调') ? 'night' : 'architecture';
const images = read('images.json').map((image, index) => ({
  ...image,
  dayId: image.day,
  placeId: imagePlace[image.id] ?? null,
  role: index === 0 || image.id === 'visual-02' || image.day !== read('images.json')[index - 1]?.day ? 'hero' : 'stop',
  type: typeFromUse(image.use),
  timeOfDay: image.bestTime,
  focalLength: image.use.includes('全景') ? '24–35mm' : image.use.includes('细节') ? '50–85mm' : '35–50mm',
  composition: image.caption.includes('人物') ? '人物占画面约1/3，保留环境尺度' : '先找引导线，再决定人物位置',
  lastVerified: '2026-09-06',
}));
write('images.json', images);

const foodRows = [
  ['rome-armando','罗马','Armando al Pantheon','午餐/晚餐','Carbonara、Coda alla vaccinara','€25–40','周一至周五12:30–15:00、18:00–23:00；周六晚及周日休息','建议预约','万神殿旁，Day 3最顺路','https://armandoalpantheon.it/'],
  ['rome-roscioli','罗马','Roscioli Salumeria con Cucina','午餐/晚餐','Carbonara、Cacio e pepe、熟食拼盘','€30–50','待确认','强烈建议预约','纳沃纳/鲜花广场步行约8–12分钟','https://www.roscioli.com/'],
  ['rome-trapizzino','罗马','Trapizzino Trastevere','午餐/加餐','Pollo alla cacciatora Trapizzino','€8–15','待确认','通常无需预约','适合罗马傍晚或回酒店前快速吃','https://www.trapizzino.it/en/'],
  ['rome-santeustachio','罗马','Sant’Eustachio Il Caffè','咖啡','Gran Caffè、Espresso','€3–8','待确认','无需预约','万神殿与纳沃纳之间','https://www.santeustachioilcaffe.it/'],
  ['florence-vinaio','佛罗伦萨',"All’Antico Vinaio",'午餐','Schiacciata夹肉奶酪','€8–15','每日10:00–22:00','无需预约；排队过长即换','领主广场旁','https://www.allanticovinaio.com/firenze/'],
  ['florence-sabatino','佛罗伦萨','Trattoria Sabatino','午餐/晚餐','Ribollita、炖肉、当日菜单','€15–25','周一至周五；具体时段待确认','建议早到','Oltrarno，Day 6顺路','https://www.trattoriasabatino.it/menu/'],
  ['florence-ditta','佛罗伦萨','Ditta Artigianale','早餐/咖啡','Flat white、意式早餐','€5–15','待确认','无需预约','市中心多店；按当天路线选分店','https://dittaartigianale.it/'],
  ['florence-nerbone','佛罗伦萨','Da Nerbone','午餐','Lampredotto、牛肚','€8–15','待确认','无需预约','中央市场内，转场日方便','https://www.mercatocentrale.com/florence/artisans/da-nerbone/'],
  ['venice-viterossa','威尼斯','Hostaria Vite Rossa','午餐/晚餐','Cicchetti、海鲜、鲜意面','€18–35','周一/周二9:00–15:30；周三至周日另有17:30–00:00','晚餐建议预约','Mestre站步行约10分钟','https://www.hostariaviterossa.it/it/'],
  ['venice-carampane','威尼斯','Antiche Carampane','午餐/晚餐','海鲜意面、炸海鲜','€40–65','周日、周一休息；其余时段待确认','建议预约','Rialto附近，Day 8午餐可选','https://www.antichecarampane.com/en/'],
  ['venice-staffa','威尼斯','Osteria alla Staffa','午餐/晚餐','墨鱼汁意面、烤章鱼','€25–40','待确认','通常不订位，开门前到','Castello，圣马可后步行约12–15分钟','https://www.google.com/maps/search/?api=1&query=Osteria+alla+Staffa+Venezia'],
  ['venice-florian','威尼斯','Caffè Florian','咖啡/甜品','Espresso、热巧克力','€15–30','待确认','通常无需预约','圣马可广场内；为环境买单','https://www.caffeflorian.com/'],
  ['vienna-figl','维也纳','Figlmüller Wollzeile','午餐/晚餐','Wiener Schnitzel、土豆沙拉','€25–40','待确认','建议预约','老城核心，Day 9/10均可','https://www.figlmueller.at/en/'],
  ['vienna-kameel','维也纳','Zum Schwarzen Kameel','早餐/午餐','开放式三明治、Tafelspitz','€15–35','待确认','吧台可临时进入','格拉本附近，Day 9顺路','https://schwarzeskameel.at/'],
  ['vienna-sperl','维也纳','Café Sperl','咖啡/甜品','Melange、Apfelstrudel','€10–20','待确认','通常无需预约','回城咖啡休息可选','http://www.cafesperl.at/'],
  ['vienna-rathaus','维也纳','Rathausplatz Christmas Market','晚餐/加餐','Käsekrainer、热红酒','€10–20','季节场次待官方公布','无需预约','Day 10市场内','https://www.christkindlmarkt.at/'],
  ['prague-lokal','布拉格','Lokál Dlouhááá','午餐/晚餐','Svíčková、炸奶酪、皮尔森啤酒','CZK 300–550','待确认','晚餐建议预约','老城北侧，Day 11顺路','https://lokal-dlouha.ambi.cz/'],
  ['prague-louvre','布拉格','Café Louvre','早餐/咖啡','捷克早餐、蛋糕、咖啡','CZK 200–450','周一至周五8:00–23:30；周末9:00–23:30','可预约','国家大街，Day 11或12','https://www.cafelouvre.cz/'],
  ['prague-kantyna','布拉格','Kantýna','午餐/晚餐','捷克牛肉、塔塔牛肉','CZK 350–700','待确认','通常可现场排队','瓦茨拉夫广场附近','https://www.kantyna.ambi.cz/'],
  ['prague-eska','布拉格','Eska','早餐/午餐','开放式三明治、发酵与烘焙','CZK 300–650','待确认','周末建议预约','Karlín，需地铁短移','https://eska.ambi.cz/'],
  ['paris-bouillon','巴黎','Bouillon Pigalle','午餐/晚餐','法式洋葱汤、油封鸭、甜点','€15–25','待确认','可预约；高峰排队','蒙马特/Pigalle，Day 16顺路','https://bouillonlesite.com/'],
  ['paris-breizh','巴黎','Breizh Café','午餐/晚餐','荞麦可丽饼、苹果酒','€20–35','待确认','建议预约','巴黎多店；按卢浮宫或玛黑路线选','https://www.breizhcafe.com/'],
  ['paris-flore','巴黎','Café de Flore','早餐/咖啡','Café crème、Croque monsieur','€15–30','每日7:30–01:30','不接受预约','左岸，Day 13/17可选','https://cafedeflore.fr/'],
  ['paris-louvre-bakery','巴黎','La Boulangerie du Louvre','午餐/加餐','法棍三明治、可颂','€8–15','随卢浮宫开放安排；待确认','无需预约','卢浮宫内，Day 14止损用','https://www.louvre.fr/en/visit/restaurants-cafes'],
  ['paris-pink','巴黎','Pink Mamma','午餐/晚餐','松露意面、提拉米苏','€25–45','通常中午至午夜；当日待确认','提前30天开放预约','Pigalle，Day 16顺路','https://www.bigmammagroup.com/fr/restaurants-italiens/pink-mamma'],
  ['paris-pigalle-cafe','巴黎','Café Pigalle','早餐/咖啡','Espresso、简餐','€8–20','周一至周五8:30–18:00；周末9:00–18:00','通常无需预约','蒙马特下山后','https://lepigalle.paris/en/cafe-pigalle/'],
];
const foodDayMap = {
  罗马:[2,3,4],佛罗伦萨:[5,6],威尼斯:[7,8],维也纳:[9,10],布拉格:[11,12],巴黎:[13,14,15,16,17]
};
const restaurants = foodRows.map((r) => ({
  id:r[0], city:r[1], name:r[2], meal:r[3], dishes:r[4], price:r[5], hours:r[6], reservation:r[7], distance:r[8], source:r[9],
  recommendedDays: foodDayMap[r[1]], mustEat: r[4].split('、')[0], mapQuery:`${r[2]} ${r[1]}`, xhsKeyword:`${r[1]} ${r[2]} 美食`,
  restaurantImage:null, dishImage:null, photoStatus:'真实餐厅与菜品图片待确认', soloFriendly:'适合1人；高峰时段以现场为准',
  lastVerified:'2026-09-06', sourceType:r[9].includes('google.com/maps')?'地图入口，营业状态待确认':'官方来源或官方旅游机构',
}));
write('restaurants.json', restaurants);

const xhsTopics = [
  ['罗马','CITY','罗马 第一次旅行 路线'],['罗马','PHOTO SPOT','罗马 许愿池 人像机位'],['罗马','PHOTO SPOT','斗兽场 人像机位'],['罗马','FOOD','罗马 carbonara 一个人'],['罗马','TIPS','梵蒂冈博物馆 动线'],
  ['佛罗伦萨','PHOTO SPOT','佛罗伦萨 米开朗基罗广场 日落'],['佛罗伦萨','FOOD','佛罗伦萨 牛肚包 咖啡'],['佛罗伦萨','SHOPPING','佛罗伦萨 小皮具 购物'],
  ['威尼斯','PHOTO SPOT','威尼斯 冬季 人像机位'],['威尼斯','CITY','威尼斯 一日 路线'],['威尼斯','FOOD','威尼斯 cicchetti 推荐'],['威尼斯','TIPS','Mestre 住哪里 去威尼斯'],
  ['维也纳','CITY','维也纳 圣诞市场 路线'],['维也纳','PHOTO SPOT','美泉宫 冬季 拍照'],['维也纳','FOOD','维也纳 炸猪排 咖啡馆'],['维也纳','GYM','维也纳 健身房 day pass'],
  ['布拉格','PHOTO SPOT','布拉格 查理大桥 人像机位'],['布拉格','CITY','布拉格 冬季 两天'],['布拉格','FOOD','布拉格 捷克菜 一个人'],['布拉格','TIPS','布拉格城堡 参观动线'],
  ['巴黎','PHOTO SPOT','巴黎 铁塔 人像机位'],['巴黎','PHOTO SPOT','巴黎 卢浮宫 拍照'],['巴黎','PHOTO SPOT','蒙马特 街拍 机位'],['巴黎','FOOD','巴黎 一个人 餐厅'],['巴黎','GYM','巴黎 健身房 day pass 拍照'],['巴黎','SHOPPING','法国 药妆 购物清单'],['巴黎','SHOPPING','巴黎 老佛爷 圣诞'],['巴黎','TIPS','巴黎 冬季 穿搭 防雨'],
].map((row,index)=>({id:`xhs-${String(index+1).padStart(2,'0')}`,city:row[0],category:row[1],keyword:row[2],url:`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(row[2])}`,linkType:'精准搜索',lastVerified:'2026-09-06'}));
write('xhs.json', xhsTopics);

const checklist = read('checklist.json');
const taskLinks = {
  'hold-hotels':'hotel-hold', 'monitor-flights':'flight-can-fco', 'visa-appointment':'visa', 'visa-evidence':'visa', 'submit-visa':'visa',
  'check-visa':'visa', 'buy-first-tickets':'colosseum', 'colosseum-release':'colosseum', 'depart':'flight-can-fco',
};
const tasks = checklist.groups.flatMap((group)=>group.items.map((item)=>({
  ...item, group:group.title, status:'To Do', linkedBookingId:taskLinks[item.id] ?? null, autoCompleteWhen:['Booked','Paid','Confirmed','Completed'],
  lastVerified:'2026-09-06'
})));
write('tasks.json',{statuses:['To Do','Doing','Done','Skipped'],items:tasks});

const hotelData = read('hotels.json');
hotelData.hotels = hotelData.hotels.map((hotel)=>({
  ...hotel,
  roomName:'Single Room / Single Bed（优先请求；实际报价房型待确认）', roomArea:'待确认', bedType:'Single bed优先；不以Double/Queen作为默认预算',
  ratingCount:hotel.rating.includes('/')?hotel.rating.split('/')[1].trim():'待确认', refundableRoomMatch:'待确认',
  airConditioning:'有无独立控制及冬季运行状态待确认', frontDesk:'见原候选信息；晚到需书面确认', lateArrival:'待确认', luggageStorage:'锁闭、员工管理方式待确认',
  noise:{...hotel.noise, elevator:'远离电梯房型需书面确认', barRestaurant:'周边酒吧/餐厅夜噪待确认', trainTram:hotel.city.includes('Mestre')?'不选车站正门及轨道侧房型':'轨道/电车低频待确认'},
  roomImages:[1,2,3].map((n)=>({id:`${hotel.id}-room-${n}`,file:null,caption:n===1?'Single Room整体与单人床':n===2?'窗户、书桌与收纳': '私人卫浴或另一核心视角',status:'房型图片待确认',source:null})),
  priceSource:'执行计划PDF中的目标日期可退价；付款页需确认Single Room与取消线', lastVerified:hotel.verifiedAt ?? '2026-09-06',
}));
write('hotels.json', hotelData);

const bookings = read('bookings.json');
bookings.statuses = ['Research','To Book','Booked','Paid','Confirmed','Completed','Cancelled'];
bookings.paymentStatuses = ['Unpaid','Paid','Refunded','N/A'];
bookings.items = bookings.items.map((item)=>({
  ...item, status:item.status==='待确认'?'Research':item.status==='待预订'?'To Book':item.status==='已预订'?'Booked':item.status==='已付款'?'Paid':item.status==='已完成'?'Completed':item.status,
  paymentStatus:'Unpaid', supplier:'', orderNumber:'', cancellationDeadline:'', address:'', serviceNumber:'', stationAirport:'', baggage:'', contact:'', notes:'', attachmentName:'', lastVerified:'2026-09-06'
}));
write('bookings.json', bookings);

console.log('Upgrade data written:', {images:images.length, restaurants:restaurants.length, xhs:xhsTopics.length, tasks:tasks.length, hotels:hotelData.hotels.length});
