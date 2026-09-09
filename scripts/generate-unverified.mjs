import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, 'data', file), 'utf8'));
const restaurants = read('restaurants.json');
const gyms = read('gyms.json');
const options = read('options.json');
const picks = read('quick-picks.json').cities;
const images = read('images.json');
const hotelBookings = read('hotel-bookings.json').items;
const transport = read('transport-recommendations.json').segments;
const shopping = read('shopping.json');
const dayRoutes = read('day-routes.json');
const cities = ['罗马','佛罗伦萨','威尼斯','维也纳','布拉格','巴黎'];
const imageIds = new Set(images.map((image) => image.placeId).filter(Boolean));
const rows = [];
const add = (category, id, name, city, fields, reason, nextAction, priority = 'P1') => rows.push({ category, id, name, city, fields, reason, nextAction, priority });

for (const city of cities) {
  const count = restaurants.filter((item) => item.city === city).length;
  if (count < 8) add('FOOD_COVERAGE', `food-coverage-${city}`, `${city}餐饮候选`, city, ['candidateCount'], `当前${count}家，低于目标8–12家；本轮不为凑数补造。`, '下一轮High从官方与可靠订餐平台补充顺路候选。', 'P1');
}
for (const item of restaurants) {
  const missing = [];
  if (!item.dishImage) missing.push('代表食物图');
  if (!item.restaurantImage && !item.environmentImage) missing.push('环境图');
  if (!item.menu?.previews?.length) missing.push('菜单预览');
  if (missing.length) add('FOOD_IMAGES', item.id, item.name, item.city, missing, item.photoStatus || '待补图', '优先官网Menu/Instagram，再核可靠平台的真实用户图。', 'P1');
  if (!item.menu?.url || item.menu?.status === 'Menu pending verification') add('FOOD_MENU', item.id, item.name, item.city, ['menuUrl','menuPrices'], '当前菜单与价格未充分验证。', '核对官方Menu PDF或页面并记录日期。', 'P1');
  const reality = [];
  if (item.address === '待确认') reality.push('address');
  if (String(item.hours).includes('待确认')) reality.push('openingHours');
  if (reality.length) add('FOOD_REALITY', item.id, item.name, item.city, reality, '缺少足够可靠的当前信息。', '从官网与地图资料交叉核验。', 'P2');
}
for (const stay of hotelBookings) {
  const fields = [];
  if (stay.execution.frontDeskType.includes('UNVERIFIED')) fields.push('24小时前台/自助入住');
  if (stay.execution.luggage.early === 'UNVERIFIED') fields.push('行李寄存');
  if (stay.execution.requests.quietRoom.includes('UNVERIFIED')) fields.push('静音请求');
  if (stay.execution.heating === 'UNVERIFIED') fields.push('暖气');
  for (const [key, value] of Object.entries(stay.execution.noise)) if (value.includes('UNVERIFIED')) fields.push(`noise.${key}`);
  if (fields.length) add('REAL_HOTEL_UNVERIFIED', stay.id, stay.hotelName, stay.city, fields, '入住凭证没有提供这些运营与噪音事实。', '取消线前向酒店书面确认，未回复前保持待确认。', 'P0');
}
for (const stay of hotelBookings) {
  const missingRoles = (stay.images ?? []).filter((image) => !image.file).map((image) => image.role);
  if (missingRoles.length) add('HOTEL_IMAGES', `${stay.id}-images`, stay.hotelName, stay.city, missingRoles, '酒店外观、房间与卫浴图尚未完成来源和画面核验。', '只补官网或可追溯实拍；完成前显示紧凑“图片待核”。', 'P0');
  if (['Required','Recommended'].includes(stay.execution.onlineCheckIn?.requirement) && !stay.execution.onlineCheckIn?.link) add('HOTEL_CHECKIN_LINK', `${stay.id}-checkin`, stay.hotelName, stay.city, ['onlineCheckIn.link'], '入住动作已知，但专属链接只存在于订单邮件或尚未收到。', '在入住邮件到达后补入专属入口。', 'P0');
}
for (const route of dayRoutes) {
  const pending = route.legs.filter((leg) => leg.recommendedMode === 'Transit' && leg.transitMin == null);
  if (pending.length) add('ROUTE_TRANSIT', `day-${route.day}-transit`, `Day ${route.day} 公交段`, `Day ${route.day}`, ['transitMin','transitRoute'], '步行和出租车路网已核，但实时公共交通班次尚未核验。', '出发前或当天用地图按酒店出发时间刷新。', 'P0');
}
for (const segment of transport) {
  const pending = segment.candidates.filter((candidate) => candidate.priceCny == null || candidate.departure == null || candidate.baggage23kg == null);
  if (pending.length) add('TRANSPORT_LIVE_DATA', segment.id, segment.route, `Day ${segment.day}`, ['实时班次','总价','23kg行李','改签条件'], '官方路线存在，但目标日期具体产品尚未形成可出票事实。', '在官方出票页按门到门时间刷新并锁定。', 'P0');
}
for (const gym of gyms) {
  const fields = [];
  if (String(gym.dayPass).includes('确认')) fields.push('Day Pass');
  if (String(gym.hours).includes('确认')) fields.push('营业时间');
  if (fields.length) add('GYM_REALITY', gym.id, gym.name, gym.city, fields, '官网或购买入口证据不足。', '出发前重新核官方页面或联系前台。', 'P1');
}
for (const shop of shopping) {
  const fields = [];
  if (String(shop.hours).includes('待')) fields.push('openingHours');
  if (!shop.image) fields.push('image');
  if (fields.length) add('SHOPPING_REALITY', shop.id, shop.name, shop.city, fields, '已建立官方来源与路线用途，12月营业时间或真实图片尚未核实。', '出发前从官方页面复核，并只补可追溯现场图。', fields.includes('openingHours') ? 'P1' : 'P2');
}
for (const option of options) if (!imageIds.has(option.id)) add('PLACE_IMAGES', option.id, option.name, option.city, ['image'], 'Quick Pick/候选地点缺少已核验真实图片。', '补官方或可追溯摄影来源，并做近似图审计。', 'P2');
for (const group of picks) for (const pick of group.items) if (!imageIds.has(pick.entityId) && !restaurants.some((item) => item.id === pick.entityId && (item.dishImage || item.restaurantImage)) && !gyms.some((item) => item.id === pick.entityId && item.image)) add('PICK_IMAGES', `${group.city}-${pick.label}`, pick.label, group.city, ['image'], 'Pick引用的Entity暂无图片。', '只在Entity补图，不在Picks复制文件。', 'P2');

const missingImageRows = rows.filter((row) => ['FOOD_IMAGES','PLACE_IMAGES','PICK_IMAGES','HOTEL_IMAGES'].includes(row.category) || (row.category === 'SHOPPING_REALITY' && row.fields.includes('image')));
const missingImages = [...new Map(missingImageRows.map((row) => [`${row.city}|${row.name}`, row])).values()];
const summary = rows.reduce((acc, row) => { acc[row.category] = (acc[row.category] ?? 0) + 1; return acc; }, {});
const prioritySummary = rows.reduce((acc, row) => { acc[row.priority] = (acc[row.priority] ?? 0) + 1; return acc; }, { P0: 0, P1: 0, P2: 0 });
const report = { generatedAt: new Date().toISOString(), policy: '真实性 > 完成率；未验证字段不进入事实结论。', total: rows.length, prioritySummary, summary, items: rows };
fs.mkdirSync(path.join(root, 'audit'), { recursive: true });
fs.writeFileSync(path.join(root, 'audit', 'unverified-data-list.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(root, 'audit', 'missing-images.json'), `${JSON.stringify({ generatedAt: report.generatedAt, total: missingImages.length, items: missingImages }, null, 2)}\n`);
const markdown = ['# UNVERIFIED DATA LIST', '', `Generated: ${report.generatedAt}`, '', '> 真实性优先。以下项目没有被当作已验证事实。', '', `P0 ${prioritySummary.P0} · P1 ${prioritySummary.P1} · P2 ${prioritySummary.P2}`, '', ...['P0','P1','P2'].flatMap((priority) => [`## ${priority} · ${prioritySummary[priority]}`, '', ...rows.filter((row) => row.priority === priority).map((row) => `- **${row.city}｜${row.name}** · ${row.category} — ${row.fields.join('、')}。${row.reason} 下一步：${row.nextAction}`), ''])].join('\n');
fs.writeFileSync(path.join(root, 'audit', 'UNVERIFIED-DATA-LIST.md'), `${markdown}\n`);
console.log(JSON.stringify({ unverified: rows.length, missingImages: missingImages.length, prioritySummary, summary }, null, 2));
