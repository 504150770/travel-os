import type { Day, DayRoute, DayRouteLeg, HotelBooking } from '@/lib/types';
import type { Entity } from '@/lib/entity-library';
import type { PlanDay, PlanItem } from '@/hooks/use-editable-plan';

export type DerivedDayState = {
  route: DayRoute;
  activeEntities: Entity[];
  firstStop: Entity | null;
  lastStop: Entity | null;
  routeContext: string;
  endMinutes: number | null;
  knownCostCny: number;
  unknownCostCount: number;
};

const parseClock = (value: string) => {
  const match = value.match(/(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

const parseDuration = (value: string) => {
  const minutes = value.match(/(\d+)\s*min/i);
  if (minutes) return Number(minutes[1]);
  const hours = value.match(/([\d.]+)\s*h/i);
  if (hours) return Math.round(Number(hours[1]) * 60);
  return null;
};

const timeLabel = (minutes: number | null) => {
  if (minutes == null) return '待确认';
  const normalized = Math.min(minutes, 23 * 60 + 59);
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
};

const pendingLeg = (
  day: number,
  index: number,
  fromId: string,
  from: string,
  toId: string,
  to: string,
): DayRouteLeg => ({
  id: `derived-d${day}-leg-${index + 1}`,
  fromId,
  from,
  toId,
  to,
  distanceKm: null,
  walkMin: null,
  transitMin: null,
  taxiTime: '待地图计算',
  recommendedMode: 'Transit',
  recommended: '路线待计算',
  baggageAdvice: '日间观光段不带大箱；转场行李按执行卡',
  status: 'PENDING',
});

function resolvedItems(
  planDay: PlanDay,
  resolve: (id: string) => Entity | undefined,
) {
  return planDay.activeItems
    .map((item) => ({ item, entity: resolve(item.entityId) }))
    .filter((row): row is { item: PlanItem; entity: Entity } =>
      Boolean(row.entity),
    );
}

export function deriveCurrentDayState({
  day,
  planDay,
  staticRoute,
  hotel,
  resolve,
  tomorrowAction,
}: {
  day: Day;
  planDay: PlanDay;
  staticRoute: DayRoute;
  hotel?: HotelBooking;
  resolve: (id: string) => Entity | undefined;
  tomorrowAction?: string;
}): DerivedDayState {
  const rows = resolvedItems(planDay, resolve);
  const activeEntities = rows.map((row) => row.entity);
  const stops = rows.filter(
    (row) => !['hotel', 'activity'].includes(row.entity.type),
  );
  const hotelNode = hotel ? { id: hotel.id, name: hotel.hotelName } : null;
  const nodes = [
    ...(hotelNode ? [hotelNode] : []),
    ...stops.map(({ entity }) => ({ id: entity.id, name: entity.name })),
    ...(hotelNode && stops.length ? [hotelNode] : []),
  ];
  const staticLegs = new Map(
    staticRoute.legs.map((leg) => [`${leg.fromId}>${leg.toId}`, leg]),
  );
  const legs = nodes.slice(0, -1).map((from, index) => {
    const to = nodes[index + 1];
    return (
      staticLegs.get(`${from.id}>${to.id}`) ??
      pendingLeg(day.day, index, from.id, from.name, to.id, to.name)
    );
  });
  const verifiedWalkLegs = legs.filter(
    (leg) => leg.status === 'ROUTED' && leg.recommendedMode === 'Walk',
  );
  const pendingCount = legs.filter((leg) => leg.status !== 'ROUTED').length;
  const walkingKm = verifiedWalkLegs.length
    ? Number(
        verifiedWalkLegs
          .reduce((sum, leg) => sum + (leg.distanceKm ?? 0), 0)
          .toFixed(1),
      )
    : null;
  const walkingMin = verifiedWalkLegs.length
    ? verifiedWalkLegs.reduce((sum, leg) => sum + (leg.walkMin ?? 0), 0)
    : null;
  const lastTimed = rows.at(-1);
  const endMinutes =
    lastTimed &&
    parseClock(lastTimed.item.time) != null &&
    parseDuration(lastTimed.item.duration) != null
      ? parseClock(lastTimed.item.time)! +
        parseDuration(lastTimed.item.duration)!
      : null;
  const first = stops[0] ?? null;
  const bookable = rows
    .filter(({ item }) => !/无票|现场即可|免费|不适用/.test(item.ticket))
    .map(({ entity }) => entity.name);
  const routeContext = stops.length
    ? `${stops[0].entity.name}${stops.length > 1 ? ` → ${stops.at(-1)!.entity.name}` : ''}`
    : (hotel?.hotelName ?? '当天路线');
  const knownCostCny = activeEntities.reduce(
    (sum, entity) => sum + (entity.projectedCostCny ?? 0),
    0,
  );
  const unknownCostCount = activeEntities.filter(
    (entity) => entity.type !== 'activity' && entity.projectedCostCny == null,
  ).length;

  return {
    activeEntities,
    firstStop: first?.entity ?? null,
    lastStop: stops.at(-1)?.entity ?? null,
    routeContext,
    endMinutes,
    knownCostCny,
    unknownCostCount,
    route: {
      ...staticRoute,
      hotelId: hotel?.id ?? staticRoute.hotelId,
      source: pendingCount
        ? 'Current Plan · verified legs reused; changed legs pending map calculation'
        : staticRoute.source,
      legs,
      summary: {
        walkingKm,
        walkingMin,
        transitMin: null,
        transfers: legs.length,
        longestWalkMin: verifiedWalkLegs.length
          ? Math.max(...verifiedWalkLegs.map((leg) => leg.walkMin ?? 0))
          : null,
        returnToHotel:
          endMinutes == null ||
          !legs.at(-1)?.walkMin ||
          legs.at(-1)?.recommendedMode !== 'Walk'
            ? '待确认（末段交通需导航核实）'
            : `预计${timeLabel(endMinutes + legs.at(-1)!.walkMin!)}`,
        status: pendingCount
          ? `${pendingCount}段路线待计算；仅汇总已核实步行段`
          : 'Current Plan 路线已匹配',
      },
      atGlance: {
        ...staticRoute.atGlance,
        start: hotel?.hotelName ?? staticRoute.atGlance.start,
        firstStop: first
          ? `${first.item.time} ${first.entity.name}`
          : '当天无正式项目',
        mustLeaveHotel:
          first &&
          parseClock(first.item.time) != null &&
          legs[0]?.recommendedMode === 'Walk' &&
          legs[0].walkMin != null
            ? timeLabel(parseClock(first.item.time)! - legs[0].walkMin - 15)
            : '按首站时间与实时导航倒推',
        mustBook: bookable.length ? bookable.join(' / ') : '无必须预订票',
        meal: `围绕 ${routeContext} 选择`,
        gym:
          day.fatigue <= 3 ? '可选 · 结合实际结束时间' : '可选 · 建议优先恢复',
        backHotel:
          endMinutes == null ||
          !legs.at(-1)?.walkMin ||
          legs.at(-1)?.recommendedMode !== 'Walk'
            ? '待确认（末段交通需导航核实）'
            : `预计${timeLabel(endMinutes + legs.at(-1)!.walkMin!)}`,
        tomorrow: tomorrowAction ?? '查看下一日 Current Plan',
      },
    },
  };
}

export function deriveGymFit(day: Day, state: DerivedDayState) {
  if (
    day.fatigue >= 5 ||
    (state.endMinutes != null && state.endMinutes >= 21 * 60)
  ) {
    return {
      level: 'skip' as const,
      label: '建议跳过',
      reason: '当天疲劳或结束时间较晚，优先恢复。',
    };
  }
  if (
    day.fatigue <= 3 &&
    state.endMinutes != null &&
    state.endMinutes <= 19 * 60
  ) {
    return {
      level: 'good' as const,
      label: '适合训练',
      reason: '当前计划留有训练窗口；仍以当天体力和营业时间为准。',
    };
  }
  return {
    level: 'possible' as const,
    label: '可临时决定',
    reason: '当前计划可尝试短练；晚于预计结束时间则跳过。',
  };
}
