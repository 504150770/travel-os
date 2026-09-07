import fs from 'node:fs';

const read = (file) => JSON.parse(fs.readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8'));
const write = (file, value) => fs.writeFileSync(new URL(`../data/${file}`, import.meta.url), `${JSON.stringify(value, null, 2)}\n`);

const days = read('days.json');
const options = read('options.json');
const restaurants = read('restaurants.json');
const gyms = read('gyms.json');

const activities = [];
const planDays = days.map((day) => {
  const activeItems = day.timeline.map((stop, index) => {
    let entityId = stop.placeId;
    if (!entityId) {
      entityId = `activity-d${day.day}-${String(index + 1).padStart(2, '0')}`;
      activities.push({
        id: entityId,
        type: stop.mode === '飞机' || stop.mode.includes('高铁') || stop.mode.includes('机场') ? 'activity' : 'activity',
        name: stop.title,
        city: day.city.split(' → ').at(-1),
        address: '待确认',
        coordinates: null,
        images: [],
        description: stop.note,
        price: null,
        openingHours: '不适用',
        links: {},
        source: '现有行程PDF与Web Guide',
        lastVerified: '2026-09-06',
        tags: [stop.mode],
        notes: stop.guard,
      });
    }
    return {
      id: `plan-d${day.day}-${String(index + 1).padStart(2, '0')}`,
      entityId,
      order: index + 1,
      time: stop.time,
      duration: stop.duration,
      status: 'planned',
      notes: stop.note,
      guard: stop.guard,
      ticket: stop.ticket ?? '现场即可',
    };
  });

  const alternativeIds = [
    ...options.filter((item) => item.recommendedDays.includes(day.day)).map((item) => item.id),
    ...restaurants.filter((item) => item.recommendedDays.includes(day.day)).map((item) => item.id),
    ...gyms.filter((item) => item.recommendedDays.includes(day.day)).map((item) => item.id),
  ];
  const alternatives = [...new Set(alternativeIds)].map((entityId, index) => ({
    id: `backup-d${day.day}-${String(index + 1).padStart(2, '0')}`,
    entityId,
    order: index + 1,
    time: '可选',
    duration: '按现场决定',
    status: 'backup',
    notes: '',
    guard: '',
    ticket: '待确认',
  }));
  return { dayId: day.day, activeItems, alternatives };
});

write('activities.json', activities);
write('day-plans.json', { version: 1, originalPlanId: 'winter-europe-2026-v1', days: planDays });

const menuDefaults = restaurants.map((item) => ({
  ...item,
  category: item.meal.includes('早餐') ? 'Breakfast' : item.meal.includes('咖啡') ? 'Cafe' : item.meal.includes('甜品') ? 'Dessert' : item.meal.includes('加餐') ? 'Snack' : item.meal.includes('晚餐') ? 'Dinner' : 'Lunch',
  address: '待确认',
  menu: {
    status: 'Menu pending verification',
    url: null,
    type: null,
    previews: [],
    prices: [],
    lastVerified: null,
  },
  environmentImage: null,
  imageSources: [],
}));
write('restaurants.json', menuDefaults);

