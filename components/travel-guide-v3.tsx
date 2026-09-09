'use client';

import Image from 'next/image';
import { safePrivateLink } from '@/lib/private-links';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BedDouble,
  Camera,
  Check,
  ChevronDown,
  Download,
  Dumbbell,
  ExternalLink,
  Heart,
  Home,
  ImageIcon,
  MapPinned,
  Menu,
  Navigation,
  Plus,
  RotateCcw,
  Route,
  Search,
  TicketCheck,
  Trash2,
  Undo2,
  Upload,
  Utensils,
  X,
} from 'lucide-react';
import { guideData } from '@/lib/data';
import {
  entityLibrary,
  entityMap,
  normalizeRouteCity,
  type Entity,
  type EntityImage,
  type EntityType,
} from '@/lib/entity-library';
import {
  useEditablePlan,
  type EditablePlan,
  type PlanItem,
} from '@/hooks/use-editable-plan';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useDialogLifecycle } from '@/hooks/use-dialog-lifecycle';
import { readUrlState, useUrlState } from '@/hooks/use-url-state';
import { MiniRoute } from '@/components/mini-route';
import {
  CheckinCenter,
  DeadlineCenter,
  HotelExecutionCard,
  SurvivalGrid,
  TodayAtGlance,
  TransitExecutionCard,
} from '@/components/execution-cards';
import quickPicks from '@/data/quick-picks.json';
import type {
  Booking,
  Day,
  DayRoute,
  DeadlineItem,
  HotelBooking,
  SurvivalCity,
  Task,
  TransitDayExecution,
  TransportSegment,
  ViewId,
} from '@/lib/types';
import {
  deriveCurrentDayState,
  deriveGymFit,
  type DerivedDayState,
} from '@/lib/derive-current-day';
import {
  buildActionQueue,
  checkinActionId,
  deadlineActionId,
  taskActionId,
} from '@/lib/action-queue';
import { calculateBudget } from '@/lib/budget-calculator';
import { canonicalBookings } from '@/lib/hotel-execution';

type DiscoverTab = 'places' | 'food' | 'gym' | 'shopping' | 'picks' | 'photos';
type PlanTab =
  | 'bookings'
  | 'transport'
  | 'checkin'
  | 'deadlines'
  | 'tasks'
  | 'budget';
type MoreTab = 'stay' | 'map' | 'survival' | 'essentials' | 'backup';
type LightboxImage = { src: string; caption: string } | null;
type CustomEntity = Entity & { type: EntityType };
type AddMode = 'place' | 'food' | 'gym' | 'custom';

const nav: { id: ViewId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'HOME', icon: Home },
  { id: 'trip', label: 'TRIP', icon: Route },
  { id: 'discover', label: 'DISCOVER', icon: Search },
  { id: 'plan', label: 'PLAN', icon: TicketCheck },
  { id: 'more', label: 'MORE', icon: Menu },
];
const cityNames = ['罗马', '佛罗伦萨', '威尼斯', '维也纳', '布拉格', '巴黎'];
const yuan = (value: number) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(value);
const routeCityForDay = (day: Day) => normalizeRouteCity(day.city);
const realStays = guideData.hotelBookings.items as HotelBooking[];
const transportSegments = guideData.transportRecommendations
  .segments as TransportSegment[];
const dayRoutes = guideData.dayRoutes as DayRoute[];
const transitExecutions =
  guideData.transitDayExecution as TransitDayExecution[];
const hotelForCity = (city: string) =>
  realStays.find((stay) => stay.city === normalizeRouteCity(city));
const hotelForNight = (date: string) =>
  realStays.find((stay) => date >= stay.checkIn && date < stay.checkOut);
const mapLinks = (entity: Entity) => ({
  google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entity.mapQuery || entity.name)}`,
  apple: `https://maps.apple.com/?q=${encodeURIComponent(entity.mapQuery || entity.name)}`,
  xhs: `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(`${entity.city} ${entity.name} 攻略`)}`,
});
const ticketBookingByEntity: Record<string, string> = {
  colosseum: 'colosseum',
  vatican_museums: 'vatican',
  pantheon: 'pantheon',
  st_mark_basilica: 'stmark',
  schonbrunn: 'schonbrunn',
  prague_castle: 'praguecastle',
  st_vitus: 'praguecastle',
  louvre: 'louvre',
  arc_triomphe: 'arc',
};
const todayDay = (date: Date) => {
  const start = new Date(`${guideData.trip.startDate}T00:00:00`);
  const end = new Date(`${guideData.trip.endDate}T23:59:59`);
  if (date < start) return 1;
  if (date > end) return 18;
  return Math.min(
    18,
    Math.floor((date.getTime() - start.getTime()) / 86400000) + 1,
  );
};

function Media({
  images,
  name,
  open,
  hero = false,
}: {
  images: EntityImage[];
  name: string;
  open: (image: LightboxImage) => void;
  hero?: boolean;
}) {
  if (!images.length)
    return (
      <div className={`entity-media pending ${hero ? 'hero' : ''}`}>
        <ImageIcon />
        <span>PHOTO PENDING</span>
      </div>
    );
  return (
    <div className={`entity-media ${hero ? 'hero' : ''}`}>
      {images.slice(0, hero ? 1 : 3).map((image) => (
        <button
          key={`${image.file}-${image.caption}`}
          onClick={() => open({ src: image.file, caption: image.caption })}
        >
          {image.file.startsWith('/') ? (
            <Image
              src={image.file}
              alt={image.caption || name}
              fill
              sizes={hero ? '100vw' : '(max-width:680px) 88vw, 420px'}
            />
          ) : (
            <span
              className="remote-image"
              title={image.caption || name}
              style={{ backgroundImage: `url(${image.file})` }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

function Favorite({
  id,
  value,
  setValue,
}: {
  id: string;
  value: Record<string, boolean>;
  setValue: (v: Record<string, boolean>) => void;
}) {
  const active = Boolean(value[id]);
  return (
    <button
      className={`favorite ${active ? 'active' : ''}`}
      onClick={() => setValue({ ...value, [id]: !active })}
      aria-label={active ? '取消收藏' : '收藏'}
    >
      <Heart size={17} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}

function EntityActions({
  entity,
  selectedDay,
  addEntity,
  placement,
}: {
  entity: Entity;
  selectedDay: number;
  addEntity: (
    id: string,
    day: number,
    target: 'activeItems' | 'alternatives',
  ) => void;
  placement: (
    id: string,
    preferredDayId?: number,
  ) => { dayId: number; zone: 'trip' | 'backup' } | null;
}) {
  const [day, setDay] = useState(selectedDay);
  const [added, setAdded] = useState(false);
  const placed = placement(entity.id, day);
  const links = mapLinks(entity);
  const add = (target: 'activeItems' | 'alternatives') => {
    addEntity(entity.id, day, target);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1300);
  };
  return (
    <div className="entity-actions">
      <select
        aria-label={`${entity.name}选择日期`}
        value={day}
        onChange={(event) => setDay(Number(event.target.value))}
      >
        {guideData.days.map((item) => (
          <option key={item.day} value={item.day}>
            D{item.day} · {routeCityForDay(item as Day)}
          </option>
        ))}
      </select>
      {placed ? (
        <>
          <span className="added-chip">
            {placed.zone === 'trip'
              ? `已加入 Day ${placed.dayId} ✓`
              : `Day ${placed.dayId} 备选`}
          </span>
          {placed.zone === 'backup' && (
            <button
              onClick={() => addEntity(entity.id, placed.dayId, 'activeItems')}
            >
              加入今天
            </button>
          )}
        </>
      ) : (
        <>
          <button onClick={() => add('activeItems')}>
            {added ? 'Added ✓' : '+ 加入今天'}
          </button>
          <button onClick={() => add('alternatives')}>加入备选</button>
        </>
      )}
      <a href={links.google} target="_blank" rel="noreferrer">
        导航
      </a>
      {entity.hotelAnchor && (
        <a
          className="from-hotel-link"
          href={entity.hotelAnchor.directionsUrl}
          target="_blank"
          rel="noreferrer"
        >
          从酒店出发
        </a>
      )}
      <details>
        <summary>•••</summary>
        <div>
          <a href={links.apple} target="_blank" rel="noreferrer">
            Apple Maps
          </a>
          <a href={links.xhs} target="_blank" rel="noreferrer">
            小红书攻略
          </a>
          {entity.source.startsWith('http') && (
            <a href={entity.source} target="_blank" rel="noreferrer">
              来源
            </a>
          )}
        </div>
      </details>
    </div>
  );
}

function PlanStop({
  item,
  entity,
  dayId,
  index,
  total,
  open,
  actions,
  bookingStatuses,
}: {
  item: PlanItem;
  entity: Entity;
  dayId: number;
  index: number;
  total: number;
  open: (image: LightboxImage) => void;
  actions: ReturnType<typeof useEditablePlan>;
  bookingStatuses: Record<string, string>;
}) {
  const [more, setMore] = useState(false);
  const links = mapLinks(entity);
  const bookingId = ticketBookingByEntity[entity.id];
  const booking = bookingId
    ? (guideData.bookings.items as Booking[]).find(
        (row) => row.id === bookingId,
      )
    : undefined;
  const ticketState = booking
    ? (bookingStatuses[booking.id] ?? booking.status)
    : item.ticket;
  return (
    <article className="editable-stop">
      <div className="stop-time">
        <input
          aria-label={`${entity.name}时间`}
          value={item.time}
          onChange={(event) =>
            actions.updateItem(dayId, item.id, { time: event.target.value })
          }
        />
        <span>{item.duration}</span>
      </div>
      <div className="stop-content">
        <div className="stop-title">
          <div>
            <small>{entity.type}</small>
            <h3>{entity.name}</h3>
          </div>
          <span className="ticket-chip">
            <TicketCheck />
            {ticketState}
          </span>
        </div>
        <Media images={entity.images} name={entity.name} open={open} />
        <p>{item.notes || entity.description}</p>
        <div className="stop-core-actions">
          <button
            disabled={index === 0}
            onClick={() => actions.moveWithin(dayId, item.id, -1)}
            aria-label="上移"
          >
            <ArrowUp />
          </button>
          <button
            disabled={index === total - 1}
            onClick={() => actions.moveWithin(dayId, item.id, 1)}
            aria-label="下移"
          >
            <ArrowDown />
          </button>
          <button
            onClick={() =>
              actions.transfer(dayId, item.id, 'activeItems', 'alternatives')
            }
          >
            加入备选
          </button>
          <a href={links.google} target="_blank" rel="noreferrer">
            <Navigation />
            导航
          </a>
          <button onClick={() => setMore(!more)}>•••</button>
        </div>
        {more && (
          <div className="more-actions">
            <label>
              换到
              <select
                value={dayId}
                onChange={(event) =>
                  actions.moveDay(dayId, item.id, Number(event.target.value))
                }
              >
                {guideData.days.map((day) => (
                  <option key={day.day} value={day.day}>
                    Day {day.day}
                  </option>
                ))}
              </select>
            </label>
            <a href={links.xhs} target="_blank" rel="noreferrer">
              XHS攻略
            </a>
            <button
              onClick={() =>
                actions.transfer(dayId, item.id, 'activeItems', 'removedItems')
              }
            >
              移除
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function AlternativePool({
  dayId,
  items,
  removed,
  resolve,
  actions,
  open,
}: {
  dayId: number;
  items: PlanItem[];
  removed: PlanItem[];
  resolve: (id: string) => Entity | undefined;
  actions: ReturnType<typeof useEditablePlan>;
  open: (image: LightboxImage) => void;
}) {
  return (
    <section id="day-backup" className="section-card alternative-pool">
      <div className="section-title">
        <div>
          <span>BACKUP / ALTERNATIVES</span>
          <h2>当天备选池</h2>
        </div>
        <RotateCcw />
      </div>
      <div className="alternative-list">
        {items.map((item) => {
          const entity = resolve(item.entityId);
          if (!entity) return null;
          return (
            <article key={item.id}>
              <Media
                images={entity.images.slice(0, 1)}
                name={entity.name}
                open={open}
              />
              <div>
                <small>{entity.type}</small>
                <h3>{entity.name}</h3>
                <p>{entity.description || entity.notes}</p>
                <button
                  onClick={() =>
                    actions.transfer(
                      dayId,
                      item.id,
                      'alternatives',
                      'activeItems',
                    )
                  }
                >
                  加入今天
                </button>
                <button
                  onClick={() =>
                    actions.transfer(
                      dayId,
                      item.id,
                      'alternatives',
                      'removedItems',
                    )
                  }
                >
                  移除
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {removed.length > 0 && (
        <details className="removed-list">
          <summary>
            已移除 · {removed.length} <ChevronDown />
          </summary>
          {removed.map((item) => {
            const entity = resolve(item.entityId);
            return (
              entity && (
                <div key={item.id}>
                  <span>{entity.name}</span>
                  <button
                    onClick={() =>
                      actions.transfer(
                        dayId,
                        item.id,
                        'removedItems',
                        'alternatives',
                      )
                    }
                  >
                    恢复
                  </button>
                </div>
              )
            );
          })}
        </details>
      )}
    </section>
  );
}

function QuickAdd({
  dayId,
  mode,
  close,
  entities,
  add,
  addCustom,
}: {
  dayId: number;
  mode: AddMode;
  close: () => void;
  entities: Entity[];
  add: (
    id: string,
    day: number,
    target: 'activeItems' | 'alternatives',
  ) => void;
  addCustom: (
    entity: CustomEntity,
    target: 'activeItems' | 'alternatives',
    duration: string,
  ) => void;
}) {
  const dialogRef = useDialogLifecycle<HTMLDialogElement>(close);
  const city = routeCityForDay(guideData.days[dayId - 1] as Day);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<'activeItems' | 'alternatives'>(
    'activeItems',
  );
  const [form, setForm] = useState({
    name: '',
    type: 'custom' as EntityType,
    address: '',
    google: '',
    xhs: '',
    notes: '',
    duration: '60min',
    image: '',
    price: '',
  });
  const types: EntityType[] =
    mode === 'food'
      ? ['restaurant', 'cafe']
      : mode === 'gym'
        ? ['gym']
        : ['place', 'shopping', 'photo_spot', 'activity'];
  const candidates = entities
    .filter(
      (entity) =>
        normalizeRouteCity(entity.city) === city &&
        types.includes(entity.type) &&
        `${entity.name}${entity.tags.join(' ')}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(a.raw.hotelPriority ?? 99) - Number(b.raw.hotelPriority ?? 99),
    );
  const submit = () => {
    if (!form.name.trim()) return;
    const id = `custom-${Date.now()}`;
    addCustom(
      {
        id,
        type: form.type,
        name: form.name.trim(),
        city,
        address: form.address || '待确认',
        mapQuery: form.google || form.name,
        coordinates: null,
        images: form.image
          ? [
              {
                file: form.image,
                caption: form.name,
                source: null,
                lastVerified: null,
                status: 'user-provided',
              },
            ]
          : [],
        description: form.notes,
        priceLabel: form.price ? `¥${form.price}` : '待确认',
        projectedCostCny: form.price ? Number(form.price) : null,
        openingHours: '待确认',
        links: { source: form.google || undefined },
        source: '用户自定义',
        lastVerified: new Date().toISOString().slice(0, 10),
        tags: ['custom'],
        notes: form.xhs,
        raw: {},
      },
      target,
      form.duration,
    );
    close();
  };
  return (
    <div
      className="sheet-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <dialog open ref={dialogRef} className="quick-sheet" aria-modal="true">
        <header>
          <div>
            <span>QUICK ADD · DAY {dayId}</span>
            <h2>
              {mode === 'custom'
                ? '添加途中发现'
                : `添加${mode === 'food' ? '餐饮' : mode === 'gym' ? 'GYM' : '地点'}`}
            </h2>
          </div>
          <button onClick={close} aria-label="关闭">
            <X />
          </button>
        </header>
        <div className="target-toggle">
          <button
            className={target === 'activeItems' ? 'active' : ''}
            onClick={() => setTarget('activeItems')}
          >
            加入今天
          </button>
          <button
            className={target === 'alternatives' ? 'active' : ''}
            onClick={() => setTarget('alternatives')}
          >
            加入备选
          </button>
        </div>
        {mode === 'custom' ? (
          <div className="custom-form">
            <input
              placeholder="名称*"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as EntityType })
              }
            >
              <option value="custom">Custom</option>
              <option value="place">Place</option>
              <option value="restaurant">Food</option>
              <option value="cafe">Cafe</option>
              <option value="gym">Gym</option>
              <option value="shopping">Shopping</option>
              <option value="photo_spot">Photo Spot</option>
            </select>
            <input
              placeholder="地址"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <input
              placeholder="Google Maps链接或查询词"
              value={form.google}
              onChange={(e) => setForm({ ...form, google: e.target.value })}
            />
            <input
              placeholder="小红书链接或关键词"
              value={form.xhs}
              onChange={(e) => setForm({ ...form, xhs: e.target.value })}
            />
            <input
              placeholder="预计时长，如60min"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
            />
            <input
              type="number"
              placeholder="预计费用 CNY（可空）"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <input
              placeholder="图片URL（可空）"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
            />
            <textarea
              placeholder="备注"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <button className="primary-action" onClick={submit}>
              保存到 Day {dayId}
            </button>
          </div>
        ) : (
          <>
            <input
              className="entity-search"
              placeholder={`搜索${city}候选`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="quick-results">
              {candidates.map((entity) => (
                <article key={entity.id}>
                  <Media
                    images={entity.images.slice(0, 1)}
                    name={entity.name}
                    open={() => {}}
                  />
                  <div>
                    <small>{entity.type}</small>
                    <h3>{entity.name}</h3>
                    <p>{entity.priceLabel}</p>
                  </div>
                  <button
                    onClick={() => {
                      add(entity.id, dayId, target);
                      close();
                    }}
                  >
                    加入
                  </button>
                </article>
              ))}
              {!candidates.length && <p>当前城市没有符合条件的已验证候选。</p>}
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}

function TonightStay({ day }: { day: Day }) {
  const [copied, setCopied] = useState(false);
  const stay = hotelForNight(day.date);
  if (!stay)
    return (
      <section className="section-card tonight-stay empty">
        <BedDouble />
        <div>
          <span>TONIGHT</span>
          <h2>无欧洲住宿</h2>
          <p>{day.day === 1 ? '国际飞行夜' : '已退房 / 返程中'}</p>
        </div>
      </section>
    );
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.execution.address)}`;
  return (
    <section className="section-card tonight-stay">
      <div className="section-title">
        <div>
          <span>TONIGHT · CONFIRMED</span>
          <h2>{stay.hotelName}</h2>
        </div>
        <BedDouble />
      </div>
      <p>
        {stay.execution.roomType} · {stay.execution.bed}
      </p>
      <div className="stay-facts">
        <span>入住 {stay.execution.checkInTime}</span>
        <span>退房 {stay.execution.checkOutTime}</span>
        <span>{stay.execution.breakfastIncluded ? '含早餐' : '不含早餐'}</span>
        <span>
          寄存{' '}
          {stay.execution.luggage.early === 'UNVERIFIED'
            ? '待确认'
            : stay.execution.luggage.early}
        </span>
      </div>
      <div className="hotel-inline-actions">
        <a href={maps} target="_blank" rel="noreferrer">
          <Navigation />
          导航
        </a>
        <button
          onClick={async () => {
            await navigator.clipboard?.writeText(stay.execution.address);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          }}
        >
          {copied ? 'Copied ✓' : '复制地址'}
        </button>
      </div>
      <small>{stay.execution.address}</small>
    </section>
  );
}

function TravelDayCard({
  dayId,
  preferredTransport,
  actionStatuses,
  privateLinks,
}: {
  dayId: number;
  preferredTransport: Record<string, string>;
  actionStatuses: Record<string, string>;
  privateLinks: Record<string, string>;
}) {
  const segment = transportSegments.find((item) => item.day === dayId);
  if (!segment) return null;
  const execution = transitExecutions.find((item) => item.day === dayId);
  if (execution)
    return (
      <TransitExecutionCard
        execution={execution}
        segment={segment}
        preferred={preferredTransport[segment.id]}
      />
    );
  const previous = realStays.find((stay) => stay.checkOut === segment.date);
  const next = realStays.find((stay) => stay.checkIn === segment.date);
  const preferred = segment.candidates.find(
    (candidate) => candidate.rank === preferredTransport[segment.id],
  );
  return (
    <section className="section-card travel-day-card">
      <div className="section-title">
        <div>
          <span>TRAVEL DAY · DOOR TO DOOR</span>
          <h2>{segment.route}</h2>
        </div>
        <Route />
      </div>
      <div className="travel-chain">
        {previous && (
          <div>
            <b>CHECK-OUT</b>
            <span>{previous.hotelName}</span>
            <small>
              {previous.execution.checkOutTime} · 寄存
              {previous.execution.luggage.early === 'UNVERIFIED'
                ? '待确认'
                : previous.execution.luggage.early}
            </small>
          </div>
        )}
        <div>
          <b>MOVE</b>
          <span>{segment.doorToDoor}</span>
          <small>{segment.recommendation}</small>
        </div>
        {next && (
          <div>
            <b>CHECK-IN</b>
            <span>{next.hotelName}</span>
            <small>
              {next.execution.checkInTime} · {next.execution.address}
            </small>
            <small>
              Online ·{' '}
              {actionStatuses[checkinActionId(next.id)] ??
                next.execution.onlineCheckIn.status}
            </small>
            {privateLinks[next.id] && (
              <a
                href={safePrivateLink(privateLinks[next.id])}
                target="_blank"
                rel="noreferrer"
              >
                打开私人入住链接
              </a>
            )}
          </div>
        )}
      </div>
      {preferred ? (
        <div className="preferred-trip-transport">
          <b>PREFERRED · {preferred.rank}</b>
          <span>
            {preferred.operator} · {preferred.service}
          </span>
          <small>
            {preferred.departure ?? '时间待确认'} →{' '}
            {preferred.arrival ?? '时间待确认'} · {preferred.duration} ·{' '}
            {preferred.priceCny == null
              ? '票价待确认'
              : yuan(preferred.priceCny)}{' '}
            · 23kg{' '}
            {preferred.baggage23kg == null
              ? '待确认'
              : preferred.baggage23kg
                ? '已含/铁路可带'
                : '未含'}
          </small>
        </div>
      ) : (
        <p className="verification-note">
          尚未选择Preferred；在 Plan → Transport 选择后会回流这里。
        </p>
      )}
      <p className="verification-note">△ 班次、票价和行李按出票页最终确认</p>
    </section>
  );
}

function DayFood({
  dayId,
  dayState,
  entities,
  actions,
  open,
}: {
  dayId: number;
  dayState: DerivedDayState;
  entities: Entity[];
  actions: ReturnType<typeof useEditablePlan>;
  open: (image: LightboxImage) => void;
}) {
  const city = routeCityForDay(guideData.days[dayId - 1] as Day);
  const stay = hotelForCity(city);
  const activeIds = new Set(
    actions.plan.days[dayId - 1].activeItems.map((item) => item.entityId),
  );
  const items = entities
    .filter(
      (entity) =>
        ['restaurant', 'cafe'].includes(entity.type) &&
        normalizeRouteCity(entity.city) === city &&
        ((entity.raw.recommendedDays as number[] | undefined)?.includes(
          dayId,
        ) ??
          false),
    )
    .sort(
      (a, b) =>
        Number(!activeIds.has(a.id)) - Number(!activeIds.has(b.id)) ||
        Number(a.raw.hotelPriority ?? 99) - Number(b.raw.hotelPriority ?? 99),
    );
  if (!items.length) return null;
  const used = new Set<string>();
  const choose = (test: (entity: Entity) => boolean, fallback = true) => {
    const picked =
      items.find((entity) => !used.has(entity.id) && test(entity)) ??
      (fallback ? items.find((entity) => !used.has(entity.id)) : undefined);
    if (picked) used.add(picked.id);
    return picked ? [picked] : [];
  };
  const groups = [
    {
      label: 'BEST NEARBY',
      items: choose((entity) => Number(entity.raw.hotelPriority ?? 99) <= 2),
    },
    {
      label: 'BEST PROPER MEAL',
      items: choose((entity) =>
        ['Lunch', 'Dinner'].includes(String(entity.raw.category)),
      ),
    },
    {
      label: 'QUICK BACKUP',
      items: choose((entity) =>
        ['Breakfast', 'Snack'].includes(String(entity.raw.category)),
      ),
    },
    {
      label: 'SOLO FRIENDLY',
      items: choose((entity) =>
        /solo|单人|counter|quick/i.test(
          `${entity.description} ${entity.notes}`,
        ),
      ),
    },
    {
      label: 'COFFEE / DESSERT',
      items: choose(
        (entity) =>
          entity.type === 'cafe' ||
          ['Cafe', 'Dessert'].includes(String(entity.raw.category)),
      ),
    },
  ].filter((group) => group.items.length);
  const compact = (entity: Entity, topPick = false) => (
    <article key={entity.id} className={topPick ? 'food-top-pick' : ''}>
      <Media
        images={entity.images.slice(0, 1)}
        name={entity.name}
        open={open}
      />
      <div>
        <small>
          {topPick ? 'TOP PICK' : 'ALTERNATIVE'} · {entity.priceLabel}
        </small>
        <h3>{entity.name}</h3>
        <dl className="food-facts">
          <div>
            <dt>代表菜</dt>
            <dd>{entity.description}</dd>
          </div>
          <div>
            <dt>预约</dt>
            <dd>{entity.notes || '待确认'}</dd>
          </div>
          <div>
            <dt>营业</dt>
            <dd>{entity.openingHours}</dd>
          </div>
          <div>
            <dt>主线距离</dt>
            <dd>
              {activeIds.has(entity.id)
                ? '已加入 Current Plan'
                : `围绕 ${dayState.routeContext} · 具体路线待导航确认`}
            </dd>
          </div>
        </dl>
        {entity.hotelAnchor && (
          <small className="hotel-anchor-note">
            离酒店：点击 From Hotel 获取实时路线 · 基点{' '}
            {entity.hotelAnchor.name}
          </small>
        )}
        <EntityActions
          entity={entity}
          selectedDay={dayId}
          addEntity={actions.addEntity}
          placement={actions.placement}
        />
      </div>
    </article>
  );
  return (
    <section id="day-food" className="section-card day-food">
      <div className="section-title">
        <div>
          <span>FOOD · CHOOSE DIRECT</span>
          <h2>今天吃什么</h2>
          {stay && <p>住宿基点：{stay.hotelName}</p>}
          <p className="route-context-note">
            CURRENT ROUTE · {dayState.routeContext}
          </p>
        </div>
        <Utensils />
      </div>
      {stay?.execution.breakfastIncluded ? (
        <p className="breakfast-hotel">BREAKFAST AT HOTEL</p>
      ) : (
        <p className="verification-note">
          早餐未包含：优先酒店附近或当天第一站顺路咖啡。
        </p>
      )}
      <div className="food-choice-grid">
        {groups.map((group) => (
          <div className="meal-group" key={group.label}>
            <h3>{group.label}</h3>
            {compact(group.items[0], true)}
          </div>
        ))}
      </div>
    </section>
  );
}

function GymDetailModal({
  entity,
  dayId,
  actions,
  close,
}: {
  entity: Entity;
  dayId: number;
  actions: ReturnType<typeof useEditablePlan>;
  close: () => void;
}) {
  const dialogRef = useDialogLifecycle(close);
  const [moveTo, setMoveTo] = useState(dayId);
  const dayPlan = actions.plan.days[dayId - 1];
  const active = dayPlan.activeItems.find(
    (item) => item.entityId === entity.id,
  );
  const backup = dayPlan.alternatives.find(
    (item) => item.entityId === entity.id,
  );
  const item = active ?? backup;
  const links = mapLinks(entity);
  const raw = entity.raw;
  const add = () =>
    actions.addEntity(entity.id, dayId, 'activeItems', { duration: '90min' });
  const remove = () =>
    item &&
    actions.transfer(
      dayId,
      item.id,
      active ? 'activeItems' : 'alternatives',
      'removedItems',
    );
  return (
    <div
      className="detail-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <dialog
        ref={dialogRef}
        open
        className="detail-modal gym-detail"
        aria-label={`${entity.name}详情`}
        aria-modal="true"
      >
        <button className="detail-close" onClick={close} aria-label="关闭">
          <X />
        </button>
        <div className="detail-hero">
          {entity.images[0] ? (
            <Image
              src={entity.images[0].file}
              alt={entity.name}
              fill
              sizes="(max-width:680px) 100vw, 720px"
            />
          ) : (
            <div className="photo-pending">
              <ImageIcon />
              <span>PHOTO PENDING</span>
            </div>
          )}
        </div>
        <div className="detail-body">
          <span>GYM DETAIL · {String(raw.tag)}</span>
          <h2>{entity.name}</h2>
          <p className="gym-rating">
            ★ {String(raw.rating)} · {entity.priceLabel}
          </p>
          <div className="detail-facts">
            <p>
              <b>Day Pass</b>
              {entity.priceLabel}
            </p>
            <p>
              <b>购买方式</b>
              {String(raw.passMethod)}
            </p>
            <p>
              <b>营业时间</b>
              {entity.openingHours}
            </p>
            <p>
              <b>从酒店</b>
              {String(raw.distance)}
            </p>
            <p>
              <b>推荐训练</b>
              {String(raw.time)}
            </p>
            <p>
              <b>器械</b>
              {String(raw.equipment)}
            </p>
            <p>
              <b>拥挤</b>
              {String(raw.crowd)}
            </p>
            <p>
              <b>灯光</b>
              {String(raw.lighting)}
            </p>
            <p>
              <b>风格</b>
              {String(raw.style)}
            </p>
            <p>
              <b>拍摄友好度</b>
              {String(raw.photo)}
            </p>
          </div>
          <p className="detail-note">
            拍摄规则以当天前台说明为准；避免拍到其他会员。
          </p>
          <div className="detail-actions">
            <a href={links.google} target="_blank" rel="noreferrer">
              Google Maps <ExternalLink />
            </a>
            {entity.hotelAnchor && (
              <a
                href={entity.hotelAnchor.directionsUrl}
                target="_blank"
                rel="noreferrer"
              >
                From Hotel <Navigation />
              </a>
            )}
            <a href={entity.source} target="_blank" rel="noreferrer">
              官网 <ExternalLink />
            </a>
            {!item && <button onClick={add}>+ 加入今天</button>}
            {backup && (
              <button
                onClick={() =>
                  actions.transfer(
                    dayId,
                    backup.id,
                    'alternatives',
                    'activeItems',
                  )
                }
              >
                加入今天
              </button>
            )}
            {item && (
              <button className="remove-action" onClick={remove}>
                移除
              </button>
            )}
          </div>
          {item && (
            <div className="gym-move">
              <b>{active ? `Added to Day ${dayId} ✓` : `Day ${dayId} 备选`}</b>
              <select
                value={moveTo}
                onChange={(event) => setMoveTo(Number(event.target.value))}
              >
                {guideData.days.map((day) => (
                  <option key={day.day} value={day.day}>
                    Day {day.day} · {routeCityForDay(day as Day)}
                  </option>
                ))}
              </select>
              <button
                disabled={moveTo === dayId}
                onClick={() => {
                  actions.moveDay(
                    dayId,
                    item.id,
                    moveTo,
                    active ? 'activeItems' : 'alternatives',
                  );
                  close();
                }}
              >
                移动
              </button>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}

function DayGym({
  day,
  dayState,
  gyms,
  actions,
  openDetail,
}: {
  day: Day;
  dayState: DerivedDayState;
  gyms: Entity[];
  actions: ReturnType<typeof useEditablePlan>;
  openDetail: (entity: Entity) => void;
}) {
  if (!gyms.length)
    return (
      <section id="day-gym" className="section-card gym-option empty-gym">
        <span>GYM</span>
        <h2>今天不安排训练</h2>
        <p>保留恢复与慢逛时间。</p>
      </section>
    );
  const dayPlan = actions.plan.days[day.day - 1];
  const fit = deriveGymFit(day, dayState);
  return (
    <section id="day-gym" className="gym-option">
      <header>
        <span>GYM OPTION</span>
        <h2>今天要不要练</h2>
        <p className={`gym-fit ${fit.level}`}>
          {fit.label} · {fit.reason}
        </p>
      </header>
      <div className="gym-option-grid">
        {gyms.map((entity, index) => {
          const active = dayPlan.activeItems.find(
            (item) => item.entityId === entity.id,
          );
          const backup = dayPlan.alternatives.find(
            (item) => item.entityId === entity.id,
          );
          const links = mapLinks(entity);
          return (
            <article
              className={`gym-option-card ${index === 0 ? 'top' : ''}`}
              key={entity.id}
            >
              <button
                className="gym-option-main"
                onClick={() => openDetail(entity)}
              >
                <div>
                  {entity.images[0] ? (
                    <Image
                      src={entity.images[0].file}
                      alt={entity.name}
                      fill
                      sizes="(max-width:680px) 100vw, 38vw"
                    />
                  ) : (
                    <div className="photo-pending">
                      <ImageIcon />
                      <span>PHOTO PENDING</span>
                    </div>
                  )}
                </div>
                <span>
                  {index === 0 ? 'TOP PICK' : 'BACKUP'} ·{' '}
                  {String(entity.raw.tag)}
                </span>
                <h3>{entity.name}</h3>
                <p>
                  ★ {String(entity.raw.rating)} · {entity.priceLabel}
                </p>
                <small>{String(entity.raw.distance)}</small>
                <dl>
                  <div>
                    <dt>推荐时间</dt>
                    <dd>{String(entity.raw.time)}</dd>
                  </div>
                  <div>
                    <dt>力量器械</dt>
                    <dd>{String(entity.raw.equipment)}</dd>
                  </div>
                  <div>
                    <dt>拍照</dt>
                    <dd>{String(entity.raw.photo)}</dd>
                  </div>
                </dl>
              </button>
              <div className="gym-option-actions">
                <button onClick={() => openDetail(entity)}>查看详情</button>
                {entity.hotelAnchor && (
                  <a
                    href={entity.hotelAnchor.directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    From Hotel
                  </a>
                )}
                <a href={links.google} target="_blank" rel="noreferrer">
                  Google Maps
                </a>
                <a href={entity.source} target="_blank" rel="noreferrer">
                  官网
                </a>
                {!active && !backup && (
                  <button
                    onClick={() =>
                      actions.addEntity(entity.id, day.day, 'activeItems', {
                        duration: '90min',
                      })
                    }
                  >
                    + 加入今天
                  </button>
                )}
                {backup && (
                  <button
                    onClick={() =>
                      actions.transfer(
                        day.day,
                        backup.id,
                        'alternatives',
                        'activeItems',
                      )
                    }
                  >
                    加入今天
                  </button>
                )}
                {active && <span>已加入 Day {day.day} ✓</span>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TripView({
  selectedDay,
  setSelectedDay,
  resolve,
  entities,
  actions,
  open,
  clock,
  addCustom,
  preferredTransport,
  tomorrowAction,
  bookingStatuses,
  actionStatuses,
  privateLinks,
}: {
  selectedDay: number;
  setSelectedDay: (d: number) => void;
  resolve: (id: string) => Entity | undefined;
  entities: Entity[];
  actions: ReturnType<typeof useEditablePlan>;
  open: (image: LightboxImage) => void;
  clock: Date | null;
  addCustom: (
    entity: CustomEntity,
    target: 'activeItems' | 'alternatives',
    duration: string,
  ) => void;
  preferredTransport: Record<string, string>;
  tomorrowAction?: string;
  bookingStatuses: Record<string, string>;
  actionStatuses: Record<string, string>;
  privateLinks: Record<string, string>;
}) {
  const day = guideData.days[selectedDay - 1] as Day;
  const planDay = actions.plan.days[selectedDay - 1];
  const route = dayRoutes[selectedDay - 1];
  const stay =
    hotelForNight(day.date) ??
    realStays.find((item) => item.checkIn === day.date);
  const tomorrowFirst = actions.plan.days[selectedDay]?.activeItems[0];
  const tomorrowFirstName = tomorrowFirst
    ? resolve(tomorrowFirst.entityId)?.name
    : undefined;
  const tomorrow =
    selectedDay < 18
      ? `D${selectedDay + 1}${tomorrowFirstName ? ` · ${tomorrowFirstName}` : ''}${tomorrowAction ? `；待办：${tomorrowAction}` : ''}`
      : (tomorrowAction ?? '返程完成');
  const dayState = useMemo(
    () =>
      deriveCurrentDayState({
        day,
        planDay,
        staticRoute: route,
        hotel: stay,
        resolve,
        tomorrowAction: tomorrow,
      }),
    [day, planDay, route, stay, resolve, tomorrow],
  );
  const currentRoute = dayState.route;
  const [quick, setQuick] = useState<AddMode | null>(null);
  const [quickMenu, setQuickMenu] = useState(false);
  const [selectedGym, setSelectedGym] = useState<Entity | null>(null);
  const tripTopRef = useRef<HTMLDivElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);
  const fixedHero = guideData.images.find(
    (image) => image.dayId === selectedDay && image.role === 'hero',
  );
  const fallbackHero = planDay.activeItems
    .map((item) => resolve(item.entityId))
    .find((entity) => entity?.images.length)?.images[0];
  const hero = fixedHero
    ? { file: fixedHero.file, caption: fixedHero.caption }
    : fallbackHero;
  const optionalGyms = entities
    .filter(
      (entity) =>
        entity.type === 'gym' &&
        normalizeRouteCity(entity.city) === routeCityForDay(day) &&
        ((entity.raw.recommendedDays as number[] | undefined)?.includes(
          selectedDay,
        ) ??
          false),
    )
    .sort(
      (a, b) =>
        Number(a.raw.hotelPriority ?? 99) - Number(b.raw.hotelPriority ?? 99),
    )
    .slice(0, 2);
  const openQuick = (mode: AddMode) => {
    setQuickMenu(false);
    setQuick(mode);
  };
  const quickButtons = (
    <>
      <button onClick={() => openQuick('place')}>
        <MapPinned />
        地点
      </button>
      <button onClick={() => openQuick('food')}>
        <Utensils />
        餐饮
      </button>
      <button onClick={() => openQuick('gym')}>
        <Dumbbell />
        健身房
      </button>
      <button onClick={() => openQuick('custom')}>
        <Plus />
        自定义
      </button>
    </>
  );
  const changeDay = (next: number) => {
    setSelectedDay(next);
    setQuickMenu(false);
    setSelectedGym(null);
  };
  useEffect(() => {
    const active = switcherRef.current?.querySelector<HTMLButtonElement>(
      '[aria-current="date"]',
    );
    active?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
    const timer = window.setTimeout(() => {
      if (tripTopRef.current)
        window.scrollTo({
          top: Math.max(0, tripTopRef.current.offsetTop - 70),
          behavior: 'smooth',
        });
    }, 30);
    return () => window.clearTimeout(timer);
  }, [selectedDay]);
  return (
    <div className="v2-view trip-v2 editable-trip" ref={tripTopRef}>
      <div className="day-switcher" ref={switcherRef}>
        {guideData.days.map((item) => (
          <button
            key={item.day}
            aria-current={item.day === selectedDay ? 'date' : undefined}
            className={item.day === selectedDay ? 'active' : ''}
            onClick={() => changeDay(item.day)}
          >
            <b>D{item.day}</b>
            <span>{routeCityForDay(item as Day)}</span>
          </button>
        ))}
      </div>
      <div className="day-controls">
        <button
          disabled={selectedDay === 1}
          onClick={() => changeDay(selectedDay - 1)}
        >
          <ArrowLeft />
          上一天
        </button>
        <button onClick={() => changeDay(todayDay(clock ?? new Date()))}>
          回到今天 · D{todayDay(clock ?? new Date())}
        </button>
        <button
          disabled={selectedDay === 18}
          onClick={() => changeDay(selectedDay + 1)}
        >
          下一天
          <ArrowRight />
        </button>
        <button
          className="reset-trip"
          onClick={() =>
            window.confirm('恢复全部Original Plan？') && actions.resetTrip()
          }
        >
          <RotateCcw />
          重置行程
        </button>
      </div>
      <div key={selectedDay} className="trip-day-content">
        <section className="day-hero">
          {hero ? (
            <Image
              key={hero.file}
              src={hero.file}
              alt={hero.caption}
              fill
              priority
              sizes="100vw"
            />
          ) : (
            <div className="hero-pending">
              <ImageIcon /> PHOTO PENDING
            </div>
          )}
          <div className="day-hero-shade" />
          <div>
            <span>
              MY CURRENT PLAN · DAY {String(day.day).padStart(2, '0')}
            </span>
            <h1>{day.theme}</h1>
            <p>
              {day.city} · {day.pace} · {day.walking}
            </p>
          </div>
        </section>
        <TodayAtGlance day={day} route={currentRoute} />
        <nav className="day-anchor-nav" aria-label="当天页面导航">
          <a href="#day-route">路线</a>
          <a href="#day-plan">行程</a>
          <a href="#day-food">餐饮</a>
          <a href="#day-gym">健身</a>
          <a href="#day-backup">备选</a>
        </nav>
        <TravelDayCard
          dayId={selectedDay}
          preferredTransport={preferredTransport}
          actionStatuses={actionStatuses}
          privateLinks={privateLinks}
        />
        <div className="trip-layout">
          <main>
            <section id="day-route" className="section-card route-flow-section">
              <div className="section-title">
                <div>
                  <span>TODAY ROUTE</span>
                  <h2>今天按这个顺序走</h2>
                </div>
                <MapPinned />
              </div>
              <MiniRoute
                day={day}
                places={guideData.places}
                route={currentRoute}
                hotel={stay}
              />
            </section>
            <section id="day-plan" className="section-card today-plan">
              <div className="section-title">
                <div>
                  <span>TODAY PLAN</span>
                  <h2>详细时间轴</h2>
                </div>
                <Camera />
              </div>
              <div className="quick-add-inline">
                <span>QUICK ADD</span>
                {quickButtons}
              </div>
              <div className="stop-list">
                {planDay.activeItems.map((item, index) => {
                  const entity = resolve(item.entityId);
                  return (
                    entity && (
                      <PlanStop
                        key={item.id}
                        item={item}
                        entity={entity}
                        dayId={selectedDay}
                        index={index}
                        total={planDay.activeItems.length}
                        open={open}
                        actions={actions}
                        bookingStatuses={bookingStatuses}
                      />
                    )
                  );
                })}
                {!planDay.activeItems.length && (
                  <div className="empty-state">
                    <ImageIcon />
                    <h3>今天还没有安排</h3>
                    <button onClick={() => openQuick('place')}>
                      + 添加地点
                    </button>
                  </div>
                )}
              </div>
            </section>
            <DayFood
              dayId={selectedDay}
              dayState={dayState}
              entities={entities}
              actions={actions}
              open={open}
            />
            <DayGym
              day={day}
              dayState={dayState}
              gyms={optionalGyms}
              actions={actions}
              openDetail={setSelectedGym}
            />
            <AlternativePool
              dayId={selectedDay}
              items={planDay.alternatives.filter(
                (item) =>
                  !['restaurant', 'cafe', 'gym'].includes(
                    resolve(item.entityId)?.type ?? '',
                  ),
              )}
              removed={planDay.removedItems ?? []}
              resolve={resolve}
              actions={actions}
              open={open}
            />
          </main>
          <aside>
            <TonightStay day={day} />
            <section className="loss-panel">
              <span>RUNNING LATE?</span>
              <h2>晚了就删，不追进度</h2>
              <p>{day.lossCut}</p>
            </section>
            <section className="section-card day-money">
              <span>DAY BUDGET</span>
              <h2>{yuan(dayState.knownCostCny || day.dayBudget)}</h2>
              <p>
                {dayState.knownCostCny
                  ? `Current Plan 已知费用 · ${dayState.unknownCostCount}项待确认`
                  : day.budgetLabel}
              </p>
            </section>
          </aside>
        </div>
      </div>
      <button
        className="quick-add-fab"
        onClick={() => setQuickMenu(!quickMenu)}
        aria-expanded={quickMenu}
      >
        <Plus /> Quick Add
      </button>
      {quickMenu && <div className="quick-add-mobile-menu">{quickButtons}</div>}
      {quick && (
        <QuickAdd
          dayId={selectedDay}
          mode={quick}
          close={() => setQuick(null)}
          entities={entities}
          add={actions.addEntity}
          addCustom={addCustom}
        />
      )}
      {selectedGym && (
        <GymDetailModal
          entity={selectedGym}
          dayId={selectedDay}
          actions={actions}
          close={() => setSelectedGym(null)}
        />
      )}
    </div>
  );
}

function EntityDetailModal({
  entity,
  selectedDay,
  actions,
  close,
}: {
  entity: Entity;
  selectedDay: number;
  actions: ReturnType<typeof useEditablePlan>;
  close: () => void;
}) {
  const dialogRef = useDialogLifecycle(close);
  const links = mapLinks(entity);
  return (
    <div
      className="detail-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <dialog
        ref={dialogRef}
        open
        className="detail-modal"
        aria-label={`${entity.name}详情`}
        aria-modal="true"
      >
        <button className="detail-close" onClick={close} aria-label="关闭">
          <X />
        </button>
        <div className="detail-hero">
          {entity.images[0] ? (
            <Image
              src={entity.images[0].file}
              alt={entity.name}
              fill
              sizes="(max-width:680px) 100vw, 720px"
            />
          ) : (
            <div className="photo-pending">
              <ImageIcon />
              <span>PHOTO PENDING</span>
            </div>
          )}
        </div>
        <div className="detail-body">
          <span>
            {entity.type.toUpperCase()} · {entity.city}
          </span>
          <h2>{entity.name}</h2>
          <p className="entity-detail-copy">
            {entity.description || entity.notes || '现场信息以官方页面为准。'}
          </p>
          <div className="detail-facts">
            <p>
              <b>价格 / 票务</b>
              {entity.priceLabel}
            </p>
            <p>
              <b>营业时间</b>
              {entity.openingHours}
            </p>
            <p>
              <b>地址</b>
              {entity.address}
            </p>
            <p>
              <b>最近核对</b>
              {entity.lastVerified}
            </p>
          </div>
          <div className="detail-actions">
            <a href={links.google} target="_blank" rel="noreferrer">
              Google Maps <ExternalLink />
            </a>
            {entity.hotelAnchor && (
              <a
                href={entity.hotelAnchor.directionsUrl}
                target="_blank"
                rel="noreferrer"
              >
                从酒店出发 <Navigation />
              </a>
            )}
            <a href={links.xhs} target="_blank" rel="noreferrer">
              小红书攻略
            </a>
            {entity.source.startsWith('http') && (
              <a href={entity.source} target="_blank" rel="noreferrer">
                官网 / 来源 <ExternalLink />
              </a>
            )}
          </div>
          <EntityActions
            entity={entity}
            selectedDay={selectedDay}
            addEntity={actions.addEntity}
            placement={actions.placement}
          />
        </div>
      </dialog>
    </div>
  );
}

function ExploreCard({
  entity,
  selectedDay,
  open,
  inspect,
  favorites,
  setFavorites,
  actions,
}: {
  entity: Entity;
  selectedDay: number;
  open: (image: LightboxImage) => void;
  inspect: (entity: Entity) => void;
  favorites: Record<string, boolean>;
  setFavorites: (v: Record<string, boolean>) => void;
  actions: ReturnType<typeof useEditablePlan>;
}) {
  const menu = entity.raw.menu as Record<string, unknown> | undefined;
  const stay = hotelForCity(entity.city);
  const hotelFit =
    typeof entity.raw.distance === 'string'
      ? entity.raw.distance
      : '点击从酒店出发获取实时路线';
  return (
    <article className="explore-card">
      <Media images={entity.images} name={entity.name} open={open} />
      <Favorite id={entity.id} value={favorites} setValue={setFavorites} />
      <button className="explore-open" onClick={() => inspect(entity)}>
        <small>
          {entity.type} · {entity.priceLabel}
        </small>
        <h2>{entity.name}</h2>
        <span>查看详情 →</span>
      </button>
      <p>{entity.description || entity.notes}</p>
      {stay && (
        <p className="hotel-fit">
          FROM HOTEL · {stay.hotelName} · {hotelFit}
        </p>
      )}
      {entity.images[0] && (
        <div className="photo-tip">
          <Camera />
          <span>
            {entity.images[0].bestTime ?? '最佳时间出发前确认'} ·{' '}
            {entity.images[0].composition ?? '人物机位出发前确认'}
          </span>
        </div>
      )}
      <dl>
        <div>
          <dt>营业</dt>
          <dd>{entity.openingHours}</dd>
        </div>
        <div>
          <dt>核对</dt>
          <dd>{entity.lastVerified}</dd>
        </div>
        {menu && (
          <div>
            <dt>菜单</dt>
            <dd>{String(menu.status)}</dd>
          </div>
        )}
      </dl>
      {entity.links.menu && (
        <a
          className="menu-link"
          href={entity.links.menu}
          target="_blank"
          rel="noreferrer"
        >
          查看菜单 <ExternalLink />
        </a>
      )}
      <EntityActions
        entity={entity}
        selectedDay={selectedDay}
        addEntity={actions.addEntity}
        placement={actions.placement}
      />
    </article>
  );
}

function DiscoverView({
  selectedDay,
  entities,
  resolve,
  actions,
  open,
  favorites,
  setFavorites,
  deleteCustom,
  tab,
  setTab,
  city,
  setCity,
}: {
  selectedDay: number;
  entities: Entity[];
  resolve: (id: string) => Entity | undefined;
  actions: ReturnType<typeof useEditablePlan>;
  open: (image: LightboxImage) => void;
  favorites: Record<string, boolean>;
  setFavorites: (v: Record<string, boolean>) => void;
  deleteCustom: (id: string) => void;
  tab: DiscoverTab;
  setTab: (tab: DiscoverTab) => void;
  city: string;
  setCity: (city: string) => void;
}) {
  const [detailEntity, setDetailEntity] = useState<Entity | null>(null);
  const types: Record<
    Exclude<DiscoverTab, 'picks' | 'photos'>,
    EntityType[]
  > = {
    places: ['place', 'activity', 'photo_spot', 'custom'],
    food: ['restaurant', 'cafe'],
    gym: ['gym'],
    shopping: ['shopping'],
  };
  const shown =
    tab === 'picks' || tab === 'photos'
      ? []
      : entities
          .filter(
            (entity) =>
              normalizeRouteCity(entity.city) === city &&
              types[tab].includes(entity.type),
          )
          .sort(
            (a, b) =>
              Number(a.raw.hotelPriority ?? 99) -
              Number(b.raw.hotelPriority ?? 99),
          );
  const picks =
    quickPicks.cities.find((item) => item.city === city)?.items ?? [];
  const photos = entities.filter(
    (entity) =>
      normalizeRouteCity(entity.city) === city &&
      entity.images.length > 0 &&
      entity.type !== 'hotel',
  );
  return (
    <div className="v2-view">
      <header className="v2-heading">
        <span>EXPLORE / INSPIRATION</span>
        <h1>一个内容库，随时加入行程</h1>
        <p>拍摄提示和XHS入口附着在每个Entity；不会再复制地点资料。</p>
      </header>
      <div className="subnav">
        {(
          [
            ['places', 'PLACES'],
            ['food', 'FOOD'],
            ['gym', 'GYM'],
            ['shopping', 'SHOPPING'],
            ['picks', 'QUICK PICKS'],
            ['photos', 'PHOTO LIBRARY'],
          ] as [DiscoverTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="city-row">
        {cityNames.map((name) => (
          <button
            key={name}
            className={city === name ? 'active' : ''}
            onClick={() => setCity(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === 'picks' ? (
        <div className="quick-pick-grid">
          {picks.map((pick) => {
            const entity = resolve(pick.entityId);
            return (
              entity && (
                <article key={`${pick.label}-${pick.entityId}`}>
                  <span>{pick.label}</span>
                  <Media
                    images={entity.images.slice(0, 1)}
                    name={entity.name}
                    open={open}
                  />
                  <h2>{entity.name}</h2>
                  <EntityActions
                    entity={entity}
                    selectedDay={selectedDay}
                    addEntity={actions.addEntity}
                    placement={actions.placement}
                  />
                </article>
              )
            );
          })}
        </div>
      ) : tab === 'photos' ? (
        <div className="visual-grid">
          {photos.flatMap((entity) =>
            entity.images.map((image) => (
              <article key={`${entity.id}-${image.file}`}>
                <button
                  className="visual-image"
                  onClick={() =>
                    open({ src: image.file, caption: image.caption })
                  }
                >
                  <Image
                    src={image.file}
                    alt={image.caption}
                    fill
                    sizes="(max-width:680px) 50vw, 28vw"
                  />
                </button>
                <span>
                  {entity.city} · {entity.type}
                </span>
                <h3>{entity.name}</h3>
              </article>
            )),
          )}
        </div>
      ) : (
        <div className="explore-grid">
          {shown.map((entity) => (
            <div key={entity.id}>
              <ExploreCard
                entity={entity}
                selectedDay={selectedDay}
                open={open}
                inspect={setDetailEntity}
                favorites={favorites}
                setFavorites={setFavorites}
                actions={actions}
              />
              {entity.type === 'custom' && (
                <button
                  className="delete-custom"
                  onClick={() =>
                    window.confirm('永久删除这个自定义项目？') &&
                    deleteCustom(entity.id)
                  }
                >
                  <Trash2 />
                  Delete Custom Item
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {detailEntity && (
        <EntityDetailModal
          entity={detailEntity}
          selectedDay={selectedDay}
          actions={actions}
          close={() => setDetailEntity(null)}
        />
      )}
    </div>
  );
}

function PlanView({
  tab,
  setTab,
  bookingStatuses,
  setBookingStatuses,
  actionStatuses,
  setActionStatuses,
  actuals,
  setActuals,
  budgetState,
  preferredTransport,
  setPreferredTransport,
  privateLinks,
  setPrivateLinks,
}: {
  tab: PlanTab;
  setTab: (t: PlanTab) => void;
  bookingStatuses: Record<string, string>;
  setBookingStatuses: (v: Record<string, string>) => void;
  actionStatuses: Record<string, string>;
  setActionStatuses: (v: Record<string, string>) => void;
  actuals: Record<string, number>;
  setActuals: (v: Record<string, number>) => void;
  budgetState: ReturnType<typeof calculateBudget>;
  preferredTransport: Record<string, string>;
  setPreferredTransport: (v: Record<string, string>) => void;
  privateLinks: Record<string, string>;
  setPrivateLinks: (v: Record<string, string>) => void;
}) {
  const bookings = canonicalBookings(
    realStays,
    guideData.bookings.items as Booking[],
  ).map((item) => ({
    ...item,
    status: bookingStatuses[item.id] ?? item.status,
  }));
  const tasks = guideData.tasks.items as Task[];
  const projected = budgetState.projected;
  const unknown = budgetState.unknown;
  const overUnder = budgetState.remaining;
  const needToSave = Math.max(0, -overUnder);
  return (
    <div className="v2-view">
      <header className="v2-heading">
        <span>PLAN / CONTROL</span>
        <h1>订单、交通、任务与预算</h1>
        <p>真实酒店订单来自6份本地入住凭证；动态票价保留待核验状态。</p>
      </header>
      <div className="subnav">
        <button
          className={tab === 'bookings' ? 'active' : ''}
          onClick={() => setTab('bookings')}
        >
          BOOKINGS
        </button>
        <button
          className={tab === 'transport' ? 'active' : ''}
          onClick={() => setTab('transport')}
        >
          TRANSPORT
        </button>
        <button
          className={tab === 'checkin' ? 'active' : ''}
          onClick={() => setTab('checkin')}
        >
          CHECK-IN
        </button>
        <button
          className={tab === 'deadlines' ? 'active' : ''}
          onClick={() => setTab('deadlines')}
        >
          DEADLINES
        </button>
        <button
          className={tab === 'tasks' ? 'active' : ''}
          onClick={() => setTab('tasks')}
        >
          TASKS
        </button>
        <button
          className={tab === 'budget' ? 'active' : ''}
          onClick={() => setTab('budget')}
        >
          BUDGET
        </button>
      </div>
      {tab === 'bookings' && (
        <>
          <section className="real-hotel-summary">
            <span>REAL HOTEL COMMITMENT</span>
            <b>{yuan(guideData.hotelBookings.summary.committedCnyApprox)}</b>
            <p>
              已支付 {yuan(guideData.hotelBookings.summary.paidOnlineCny)} ·
              到店税费约{' '}
              {yuan(guideData.hotelBookings.summary.payAtPropertyCnyApprox)} ·
              15晚固定承诺成本
            </p>
          </section>
          <div className="booking-v2">
            {bookings.map((item) => (
              <details key={item.id}>
                <summary>
                  <div>
                    <span>
                      {item.category} · {item.date}
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                  </div>
                  <b>{yuan(item.budget)}</b>
                  <select
                    value={bookingStatuses[item.id] ?? item.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      setBookingStatuses({
                        ...bookingStatuses,
                        [item.id]: e.target.value,
                      })
                    }
                  >
                    {guideData.bookings.statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                  <ChevronDown />
                </summary>
                <div className="booking-detail">
                  <p>
                    <b>订单号</b>
                    {item.orderNumber || '待确认'}
                  </p>
                  <p>
                    <b>取消线</b>
                    {item.cancellationDeadline || '待确认'}
                  </p>
                  <p>
                    <b>地址/站点</b>
                    {item.address || item.stationAirport || '待确认'}
                  </p>
                  <p>
                    <b>行李</b>
                    {item.baggage || '待确认'}
                  </p>
                  <p>
                    <b>凭证</b>
                    {item.attachmentName || '待上传'}
                  </p>
                  <p>
                    <b>备注</b>
                    {item.notes || '—'}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </>
      )}
      {tab === 'transport' && (
        <div className="transport-grid">
          {transportSegments.map((segment) => (
            <article key={segment.id}>
              <header>
                <span>
                  DAY {segment.day} · {segment.date} · CHECKED{' '}
                  {segment.checkedAt}
                </span>
                <h2>{segment.route}</h2>
                <p>{segment.doorToDoor}</p>
              </header>
              <p>{segment.recommendation}</p>
              {segment.airportComparison && (
                <div className="airport-comparison">
                  {segment.airportComparison.map((item) => (
                    <div key={item.airport}>
                      <b>
                        {item.airport} · SCORE {item.doorToDoorScore}
                      </b>
                      <span>{item.ground}</span>
                      <small>{item.decision}</small>
                    </div>
                  ))}
                </div>
              )}
              <div className="transport-candidates">
                {segment.candidates.map((candidate) => (
                  <div key={candidate.rank}>
                    <b>{candidate.rank}</b>
                    <span>
                      {candidate.operator ?? '运营方待确认'} ·{' '}
                      {candidate.service ?? '班次待确认'}
                    </span>
                    <dl>
                      <div>
                        <dt>TIME</dt>
                        <dd>
                          {candidate.departure ?? '待确认'} →{' '}
                          {candidate.arrival ?? '待确认'} ·{' '}
                          {candidate.arrivalDate}
                        </dd>
                      </div>
                      <div>
                        <dt>DURATION</dt>
                        <dd>
                          {candidate.duration} · {candidate.changes}次换乘
                        </dd>
                      </div>
                      <div>
                        <dt>FARE</dt>
                        <dd>
                          {candidate.priceCny == null
                            ? '目标日价格待确认'
                            : `${yuan(candidate.priceCny)} 基础含税`}{' '}
                          · {candidate.fareType}
                        </dd>
                      </div>
                      <div>
                        <dt>BAG</dt>
                        <dd>
                          23kg{' '}
                          {candidate.baggage23kg == null
                            ? '待确认'
                            : candidate.baggage23kg
                              ? '已含/铁路可带'
                              : '未含'}{' '}
                          · {candidate.carryOn}
                        </dd>
                      </div>
                      <div>
                        <dt>TRANSFER</dt>
                        <dd>
                          {candidate.transit ?? '直达'} · 航站楼
                          {candidate.terminalChange ?? '不适用'} ·{' '}
                          {candidate.selfTransfer
                            ? 'SELF-TRANSFER'
                            : '非自助转机'}
                        </dd>
                      </div>
                      <div>
                        <dt>CHANGE</dt>
                        <dd>
                          {candidate.refundability} · 改签费
                          {candidate.changeFee}
                        </dd>
                      </div>
                    </dl>
                    <i title={candidate.status}>
                      {candidate.status.includes('VERIFIED') ||
                      candidate.status.includes('CAPTURED')
                        ? '✓ 已核'
                        : '△ 出发前确认'}
                    </i>
                    <small>
                      班次号 {candidate.flightNo ?? '待确认'} · checked{' '}
                      {candidate.checkedAt}
                    </small>
                    <button
                      className={
                        preferredTransport[segment.id] === candidate.rank
                          ? 'preferred'
                          : ''
                      }
                      onClick={() =>
                        setPreferredTransport({
                          ...preferredTransport,
                          [segment.id]: candidate.rank,
                        })
                      }
                    >
                      {preferredTransport[segment.id] === candidate.rank
                        ? 'PREFERRED'
                        : 'Select as Preferred'}
                    </button>
                  </div>
                ))}
              </div>
              {segment.expectedReleaseWindow && (
                <p className="release-window">
                  RECHECK WINDOW · {segment.expectedReleaseWindow}
                </p>
              )}
              <footer>
                <span title={segment.status}>
                  △ 班次、票价和行李按出票页最终确认
                </span>
                <div>
                  <a href={segment.source} target="_blank" rel="noreferrer">
                    目标日查询 <ExternalLink />
                  </a>
                  <a
                    href={segment.routeSource}
                    target="_blank"
                    rel="noreferrer"
                  >
                    官方线路 <ExternalLink />
                  </a>
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
      {tab === 'checkin' && (
        <CheckinCenter
          stays={realStays}
          statuses={actionStatuses}
          setStatuses={setActionStatuses}
          privateLinks={privateLinks}
          setPrivateLinks={setPrivateLinks}
        />
      )}
      {tab === 'deadlines' && (
        <DeadlineCenter
          items={guideData.deadlines as DeadlineItem[]}
          statuses={actionStatuses}
          setStatuses={setActionStatuses}
        />
      )}
      {tab === 'tasks' && (
        <div className="task-v2">
          {tasks.map((task) => {
            const linked = task.linkedBookingId
              ? bookingStatuses[task.linkedBookingId]
              : undefined;
            const synced = Boolean(
              linked && task.autoCompleteWhen.includes(linked),
            );
            const actionId = taskActionId(task.id);
            const status = synced
              ? 'Done'
              : (actionStatuses[actionId] ?? task.status);
            return (
              <article key={task.id}>
                <button
                  onClick={() =>
                    setActionStatuses({
                      ...actionStatuses,
                      [actionId]: status === 'Done' ? 'Open' : 'Done',
                    })
                  }
                >
                  <Check />
                </button>
                <div>
                  <span>
                    {task.group} · {task.due}
                  </span>
                  <h3>{task.title}</h3>
                  <p>{task.note}</p>
                  {synced && <small>由Booking自动完成</small>}
                </div>
                <select
                  disabled={synced}
                  value={status}
                  onChange={(e) =>
                    setActionStatuses({
                      ...actionStatuses,
                      [actionId]: e.target.value,
                    })
                  }
                >
                  {[
                    'Open',
                    'Ready',
                    'Waiting',
                    'Required',
                    'Doing',
                    'Done',
                    'Skipped',
                  ].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </article>
            );
          })}
        </div>
      )}
      {tab === 'budget' && (
        <div>
          <div className="budget-summary">
            <div>
              <span>HARD CAP</span>
              <b>{yuan(guideData.budget.hardCap)}</b>
            </div>
            <div>
              <span>CURRENT COMMITTED</span>
              <b>{yuan(budgetState.committed)}</b>
            </div>
            <div>
              <span>PROJECTED</span>
              <b
                className={
                  projected > guideData.budget.hardCap ? 'over-budget' : ''
                }
              >
                {yuan(projected)}
              </b>
            </div>
            <div>
              <span>{overUnder < 0 ? 'OVER CAP' : 'REMAINING'}</span>
              <b className={overUnder < 0 ? 'over-budget' : ''}>
                {yuan(Math.abs(overUnder))}
              </b>
            </div>
          </div>
          <div className="budget-state-split">
            <span>COMMITTED {yuan(budgetState.committed)}</span>
            <span>PLANNED {yuan(budgetState.planned)}</span>
            <span>OPTIONAL {yuan(budgetState.optional)}</span>
            <span>RESERVE {yuan(budgetState.reserve)}</span>
          </div>
          <p className="budget-note">
            酒店 {yuan(guideData.budget.fixedCommitted.amount)} 为 FIXED
            COMMITTED COST，不纳入节省项。购物最低{' '}
            {yuan(guideData.budget.shoppingFloor)} 保留。{unknown} 个Current
            Trip项目缺少可靠人民币价格，未计入Projected。
          </p>
          <section className="recovery-plan">
            <span>BUDGET RECOVERY PLAN</span>
            <h2>目标节省 {yuan(needToSave)}</h2>
            <div>
              {guideData.budget.recoveryPlan.map((item) => (
                <article key={item.id}>
                  <b>{item.label}</b>
                  <strong>{yuan(item.targetSaving)}</strong>
                  <p>{item.action}</p>
                </article>
              ))}
            </div>
          </section>
          <div className="budget-lines">
            {guideData.budget.categories.map((item) => {
              const spent = Number(actuals[item.id] ?? 0);
              const remaining = item.budget - spent;
              return (
                <label key={item.id}>
                  <span>
                    {item.name}
                    {item.id === 'hotels' && <em>FIXED</em>}
                    {item.id === 'shopping' && <em>RESERVED</em>}
                  </span>
                  <strong>{yuan(item.budget)}</strong>
                  <input
                    type="number"
                    value={actuals[item.id] ?? ''}
                    placeholder="实际支出"
                    onChange={(e) =>
                      setActuals({
                        ...actuals,
                        [item.id]: Number(e.target.value),
                      })
                    }
                  />
                  <b className={remaining < 0 ? 'over-budget' : ''}>
                    剩余 {yuan(remaining)}
                  </b>
                  <small>{item.note}</small>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Stay({
  privateLinks = {},
}: {
  privateLinks?: Record<string, string>;
}) {
  return (
    <div className="confirmed-stays">
      <header className="confirmed-stays-summary">
        <span>CONFIRMED STAYS · 6 CITIES</span>
        <h2>15晚住宿执行卡</h2>
        <p>
          固定承诺 {yuan(guideData.hotelBookings.summary.committedCnyApprox)} ·
          已支付 {yuan(guideData.hotelBookings.summary.paidOnlineCny)} ·
          到店税费约{' '}
          {yuan(guideData.hotelBookings.summary.payAtPropertyCnyApprox)}
        </p>
      </header>
      <div className="confirmed-stay-list">
        {realStays.map((stay) => (
          <HotelExecutionCard
            key={stay.id}
            stay={stay}
            privateCheckInLink={privateLinks[stay.id]}
          />
        ))}
      </div>
    </div>
  );
}

type BackupPayload = {
  version: 3 | 4;
  exportedAt: string;
  currentItinerary: EditablePlan;
  customEntities: CustomEntity[];
  bookingStatuses: Record<string, string>;
  actionStatuses?: Record<string, string>;
  taskStatuses?: Record<string, string>;
  actuals: Record<string, number>;
  notes: string;
  favorites: Record<string, boolean>;
  preferredTransport?: Record<string, string>;
  checkinCompleted?: Record<string, boolean>;
  deadlineStatuses?: Record<string, string>;
};
function MoreView({
  tab,
  setTab,
  selectedDay,
  setSelectedDay,
  backup,
  importBackup,
  notes,
  setNotes,
  actions,
  resolve,
  privateLinks,
}: {
  tab: MoreTab;
  setTab: (t: MoreTab) => void;
  selectedDay: number;
  setSelectedDay: (d: number) => void;
  backup: BackupPayload;
  importBackup: (v: BackupPayload) => void;
  notes: string;
  setNotes: (v: string) => void;
  actions: ReturnType<typeof useEditablePlan>;
  resolve: (id: string) => Entity | undefined;
  privateLinks: Record<string, string>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const exportJson = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `europe-travel-os-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="v2-view">
      <header className="v2-heading">
        <span>MORE</span>
        <h1>住宿、地图与离线备份</h1>
        <p>Current Stay、用户日程与自定义Entity都会进入同一份JSON。</p>
      </header>
      <div className="subnav">
        <button
          className={tab === 'stay' ? 'active' : ''}
          onClick={() => setTab('stay')}
        >
          STAY
        </button>
        <button
          className={tab === 'map' ? 'active' : ''}
          onClick={() => setTab('map')}
        >
          ROUTES
        </button>
        <button
          className={tab === 'survival' ? 'active' : ''}
          onClick={() => setTab('survival')}
        >
          SURVIVAL
        </button>
        <button
          className={tab === 'essentials' ? 'active' : ''}
          onClick={() => setTab('essentials')}
        >
          ESSENTIALS
        </button>
        <button
          className={tab === 'backup' ? 'active' : ''}
          onClick={() => setTab('backup')}
        >
          BACKUP
        </button>
      </div>
      {tab === 'stay' && <Stay privateLinks={privateLinks} />}{' '}
      {tab === 'map' && (
        <div>
          <div className="day-switcher">
            {guideData.days.map((day) => (
              <button
                key={day.day}
                className={day.day === selectedDay ? 'active' : ''}
                onClick={() => setSelectedDay(day.day)}
              >
                <b>D{day.day}</b>
                <span>{routeCityForDay(day as Day)}</span>
              </button>
            ))}
          </div>
          <section className="section-card">
            {(() => {
              const currentDay = guideData.days[selectedDay - 1] as Day;
              const currentStay =
                hotelForNight(currentDay.date) ??
                realStays.find((stay) => stay.checkIn === currentDay.date);
              const state = deriveCurrentDayState({
                day: currentDay,
                planDay: actions.plan.days[selectedDay - 1],
                staticRoute: dayRoutes[selectedDay - 1],
                hotel: currentStay,
                resolve,
              });
              return (
                <MiniRoute
                  day={currentDay}
                  places={guideData.places}
                  route={state.route}
                  hotel={currentStay}
                />
              );
            })()}
          </section>
        </div>
      )}{' '}
      {tab === 'survival' && (
        <SurvivalGrid
          items={guideData.survival as SurvivalCity[]}
          stays={realStays}
        />
      )}{' '}
      {tab === 'essentials' && (
        <div className="essentials-v2">
          {guideData.essentials.groups.map((group) => (
            <details key={group.id}>
              <summary>
                {group.title}
                <ChevronDown />
              </summary>
              {group.items.map((item) => (
                <p key={item}>
                  <Check />
                  {item}
                </p>
              ))}
            </details>
          ))}
        </div>
      )}{' '}
      {tab === 'backup' && (
        <div className="backup-v2">
          <article>
            <Download />
            <h2>EXPORT TRAVEL DATA</h2>
            <p>
              包含Current
              itinerary、备选池、自定义Entity、酒店、订单、任务、预算、备注和收藏。
            </p>
            <button onClick={exportJson}>导出JSON</button>
          </article>
          <article>
            <Upload />
            <h2>IMPORT TRAVEL DATA</h2>
            <p>导入会覆盖当前浏览器的旅行数据。</p>
            <input
              ref={fileRef}
              hidden
              type="file"
              accept="application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file)
                  importBackup(JSON.parse(await file.text()) as BackupPayload);
              }}
            />
            <button onClick={() => fileRef.current?.click()}>
              选择备份文件
            </button>
          </article>
          <label>
            <span>TRIP NOTES</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}

function Lightbox({
  image,
  close,
}: {
  image: LightboxImage;
  close: () => void;
}) {
  const dialogRef = useDialogLifecycle(close, Boolean(image));
  if (!image) return null;
  return (
    <dialog ref={dialogRef} className="v2-lightbox" open aria-modal="true">
      <button onClick={close}>
        <X />
      </button>
      <div>
        {image.src.startsWith('/') ? (
          <Image src={image.src} alt={image.caption} fill sizes="96vw" />
        ) : (
          <span
            className="remote-image"
            title={image.caption}
            style={{ backgroundImage: `url(${image.src})` }}
          />
        )}
      </div>
      <p>{image.caption}</p>
    </dialog>
  );
}

export default function TravelGuideV3() {
  const [clock, setClock] = useState<Date | null>(null);
  const [view, setView] = useState<ViewId>('home');
  const [selectedDay, setSelectedDay] = useState(1);
  const [planTab, setPlanTab] = useState<PlanTab>('bookings');
  const [moreTab, setMoreTab] = useState<MoreTab>('stay');
  const [discoverTab, setDiscoverTab] = useState<DiscoverTab>('places');
  const [discoverCity, setDiscoverCity] = useState('罗马');
  const [online, setOnline] = useState(true);
  const [lightbox, setLightbox] = useState<LightboxImage>(null);
  const actions = useEditablePlan();
  const [customEntities, setCustomEntities] = useLocalStorage<CustomEntity[]>(
    'europe-guide-custom-entities-v1',
    [],
  );
  const [bookingStatuses, setBookingStatuses] = useLocalStorage<
    Record<string, string>
  >('europe-guide-booking-statuses', {});
  const [storedActionStatuses, setActionStatuses] = useLocalStorage<
    Record<string, string>
  >('europe-guide-action-statuses-v4', {});
  const [actuals, setActuals] = useLocalStorage<Record<string, number>>(
    'europe-guide-budget-actuals',
    { hotels: guideData.hotelBookings.summary.paidOnlineCny },
  );
  const [favorites, setFavorites] = useLocalStorage<Record<string, boolean>>(
    'europe-guide-favorites',
    {},
  );
  const [preferredTransport, setPreferredTransport] = useLocalStorage<
    Record<string, string>
  >('europe-guide-preferred-transport-v1', {});
  const [privateLinks, setPrivateLinks] = useLocalStorage<
    Record<string, string>
  >('europe-guide-private-checkin-links-v1', {});
  const [notes, setNotes] = useLocalStorage('europe-guide-notes', '');
  const actionStatuses = useMemo(() => {
    const result = { ...storedActionStatuses };
    const ticketActions: Record<string, string> = {
      vatican: 'ticket-vatican',
      colosseum: 'ticket-colosseum',
      louvre: 'ticket-louvre',
    };
    for (const [id, deadline] of Object.entries(ticketActions)) {
      if (
        ['Booked', 'Paid', 'Confirmed', 'Completed'].includes(
          bookingStatuses[id],
        )
      )
        result[`deadline:${deadline}`] = 'Done';
    }
    return result;
  }, [storedActionStatuses, bookingStatuses]);

  const applyUrl = () => {
    const state = readUrlState();
    if (['home', 'trip', 'discover', 'plan', 'more'].includes(state.view ?? ''))
      setView(state.view as ViewId);
    if (state.day >= 1 && state.day <= 18) setSelectedDay(state.day);
    if (
      [
        'bookings',
        'transport',
        'checkin',
        'deadlines',
        'tasks',
        'budget',
      ].includes(state.tab ?? '')
    )
      setPlanTab(state.tab as PlanTab);
    if (
      ['stay', 'routes', 'map', 'survival', 'essentials', 'backup'].includes(
        state.tab ?? '',
      )
    )
      setMoreTab(state.tab === 'routes' ? 'map' : (state.tab as MoreTab));
    if (
      ['places', 'food', 'gym', 'shopping', 'picks', 'photos'].includes(
        state.tab ?? '',
      )
    )
      setDiscoverTab(state.tab as DiscoverTab);
    if (cityNames.includes(state.city ?? '')) setDiscoverCity(state.city!);
    window.setTimeout(
      () =>
        window.scrollTo(
          0,
          Number(
            sessionStorage.getItem(
              `travel-scroll:${location.pathname}${location.search}`,
            ) ?? 0,
          ),
        ),
      0,
    );
  };
  const writeUrl = useUrlState(applyUrl);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = new Date();
      setClock(current);
      const url = readUrlState();
      if (url.view) applyUrl();
      else setSelectedDay(todayDay(current));
      const start = new Date(`${guideData.trip.startDate}T00:00:00`);
      const end = new Date(`${guideData.trip.endDate}T23:59:59`);
      if (!url.view && current >= start && current <= end) setView('trip');
      setOnline(navigator.onLine);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    try {
      const legacyTasks = JSON.parse(
        localStorage.getItem('europe-guide-task-statuses') ?? '{}',
      ) as Record<string, string>;
      const legacyDeadlines = JSON.parse(
        localStorage.getItem('travel-deadline-statuses-v1') ?? '{}',
      ) as Record<string, string>;
      const legacyCheckins = JSON.parse(
        localStorage.getItem('travel-checkin-completed-v1') ?? '{}',
      ) as Record<string, boolean>;
      if (
        !Object.keys(storedActionStatuses).length &&
        (Object.keys(legacyTasks).length ||
          Object.keys(legacyDeadlines).length ||
          Object.keys(legacyCheckins).length)
      ) {
        const migrated: Record<string, string> = {};
        Object.entries(legacyTasks).forEach(([id, status]) => {
          migrated[taskActionId(id)] = status;
        });
        (guideData.deadlines as DeadlineItem[]).forEach((item) => {
          if (legacyDeadlines[item.id])
            migrated[deadlineActionId(item)] = legacyDeadlines[item.id];
        });
        Object.entries(legacyCheckins).forEach(([id, done]) => {
          migrated[checkinActionId(id)] = done ? 'Done' : 'Waiting';
        });
        setActionStatuses(migrated);
      }
    } catch {
      /* Leave unreadable legacy data untouched. */
    }
  }, [storedActionStatuses, setActionStatuses]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    const timer = window.setTimeout(() => {
      const nodes = document.querySelectorAll<HTMLElement>(
        '.section-card, .editable-stop, .explore-card, .hotel-execution-card, .meal-group, .gym-option-card, .transit-execution',
      );
      observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer?.unobserve(entry.target);
            }
          }),
        { threshold: 0.08, rootMargin: '0px 0px -28px' },
      );
      nodes.forEach((node, index) => {
        node.classList.add('motion-reveal');
        node.style.setProperty('--reveal-index', `${index % 6}`);
        observer?.observe(node);
      });
    }, 40);
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [view, selectedDay, planTab, moreTab]);

  const entities = useMemo(
    () => [...entityLibrary, ...customEntities],
    [customEntities],
  );
  const resolve = (id: string) =>
    customEntities.find((entity) => entity.id === id) ?? entityMap.get(id);
  const addCustom = (
    entity: CustomEntity,
    target: 'activeItems' | 'alternatives',
    duration: string,
  ) => {
    setCustomEntities([...customEntities, entity]);
    actions.addEntity(entity.id, selectedDay, target, { duration });
  };
  const deleteCustom = (id: string) => {
    actions.deleteEntity(id);
    setCustomEntities(customEntities.filter((entity) => entity.id !== id));
  };
  const activeEntities = actions.plan.days
    .flatMap((day) => day.activeItems.map((item) => resolve(item.entityId)))
    .filter(Boolean) as Entity[];
  const bookings = canonicalBookings(
    realStays,
    guideData.bookings.items as Booking[],
  ).map((item) => ({
    ...item,
    status: bookingStatuses[item.id] ?? item.status,
  }));
  const budgetState = calculateBudget({
    budget: guideData.budget,
    bookings,
    plan: actions.plan,
    resolve,
  });
  const actionQueue = buildActionQueue({
    deadlines: guideData.deadlines as DeadlineItem[],
    tasks: guideData.tasks.items as Task[],
    stays: realStays,
    statuses: actionStatuses,
    bookingStatuses,
  });
  const displayActionStatuses = Object.fromEntries(
    actionQueue.map((item) => [item.id, item.status]),
  );
  const nextAction = actionQueue.find(
    (item) => !['Done', 'Skipped'].includes(item.status),
  );
  const actualTotal = Object.values(actuals).reduce(
    (sum, value) => sum + Number(value || 0),
    0,
  );
  const navigate = (next: ViewId) => {
    sessionStorage.setItem(
      `travel-scroll:${location.pathname}${location.search}`,
      String(window.scrollY),
    );
    setView(next);
    const tab =
      next === 'plan'
        ? planTab
        : next === 'discover'
          ? discoverTab
          : next === 'more'
            ? moreTab === 'map'
              ? 'routes'
              : moreTab
            : null;
    writeUrl({
      view: next,
      day: next === 'trip' || next === 'more' ? selectedDay : null,
      tab,
      city: next === 'discover' ? discoverCity : null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const backup: BackupPayload = {
    version: 4,
    exportedAt: new Date().toISOString(),
    currentItinerary: actions.plan,
    customEntities,
    bookingStatuses,
    actionStatuses,
    actuals,
    notes,
    favorites,
    preferredTransport,
  };
  const importBackup = (data: BackupPayload) => {
    if (![3, 4].includes(data.version))
      return window.alert('仅支持V3/V4旅行数据');
    localStorage.setItem(
      'europe-guide-current-itinerary-v1',
      JSON.stringify(data.currentItinerary),
    );
    setCustomEntities(data.customEntities ?? []);
    setBookingStatuses(data.bookingStatuses ?? {});
    const importedActions =
      data.actionStatuses ??
      Object.fromEntries(
        Object.entries(data.taskStatuses ?? {}).map(([id, status]) => [
          taskActionId(id),
          status,
        ]),
      );
    setActionStatuses(importedActions);
    setActuals(data.actuals ?? {});
    setNotes(data.notes ?? '');
    setFavorites(data.favorites ?? {});
    setPreferredTransport(data.preferredTransport ?? {});
    window.location.reload();
  };
  const daysLeft = clock
    ? Math.ceil(
        (new Date(`${guideData.trip.startDate}T00:00:00`).getTime() -
          clock.getTime()) /
          86400000,
      )
    : null;
  return (
    <div className="guide-v2">
      <aside className="side-nav">
        <button className="v2-brand" onClick={() => navigate('home')}>
          <b>EU</b>
          <span>
            TRAVEL
            <br />
            OS
          </span>
        </button>
        <nav>
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? 'active' : ''}
              onClick={() => navigate(id)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="side-meta">
          <i />
          <span>Entity Library active</span>
          <b>Local-first editable plan</b>
        </div>
      </aside>
      <main className="v2-main">
        <header className="v2-topbar">
          <div>
            <span>PERSONAL EUROPE / 2026</span>
            <b>{nav.find((item) => item.id === view)?.label}</b>
          </div>
          <p>12.01 — 12.18 · 15 NIGHTS</p>
          <span
            className={online ? 'connectivity online' : 'connectivity offline'}
          >
            {online ? '在线 · 本机保存' : '离线 · 已缓存内容可用'}
          </span>
        </header>
        <div key={view} className="view-transition">
          {view === 'home' && (
            <div className="v2-view home-v2">
              <section className="home-cover">
                <Image
                  src={guideData.trip.coverImage}
                  alt="冬季欧洲街景"
                  fill
                  priority
                  sizes="100vw"
                />
                <div className="cover-shade" />
                <div className="cover-copy">
                  <span>PERSONAL WINTER EUROPE · 2026</span>
                  <h1>
                    我的欧洲
                    <br />
                    旅行操作系统。
                  </h1>
                  <p>原始计划保留 · 当前计划可随时改 · 数据本地保存</p>
                  <button onClick={() => navigate('trip')}>
                    进入 Trip Mode <ArrowRight />
                  </button>
                </div>
                <div className="countdown">
                  <b>{daysLeft ?? '—'}</b>
                  <span>{daysLeft === null ? '行程倒计时' : '天后出发'}</span>
                </div>
              </section>
              <section className="route-ribbon">
                {guideData.trip.cities.map((city) => (
                  <div key={city.id}>
                    <i style={{ background: city.accent }} />
                    <b>{city.name}</b>
                    <span>{city.nights}晚</span>
                  </div>
                ))}
              </section>
              <section className="home-dashboard">
                <article>
                  <span>NEXT ACTION · {nextAction?.due ?? 'OPEN'}</span>
                  <h2>{nextAction?.title ?? '当前任务已完成'}</h2>
                  <p>{nextAction?.detail}</p>
                  <button
                    onClick={() => {
                      navigate('plan');
                      const target = nextAction?.target ?? 'tasks';
                      setPlanTab(target);
                      writeUrl(
                        { view: 'plan', tab: target, day: null, city: null },
                        'replace',
                      );
                    }}
                  >
                    打开 Plan <ArrowRight />
                  </button>
                </article>
                <article>
                  <span>PROJECTED / ACTUAL</span>
                  <h2>
                    {yuan(budgetState.projected)} / {yuan(actualTotal)}
                  </h2>
                  <p>
                    {budgetState.unknown}项费用待确认；Current
                    Plan变更会自动重算
                  </p>
                  <button
                    onClick={() => {
                      navigate('plan');
                      setPlanTab('budget');
                    }}
                  >
                    管理预算 <ArrowRight />
                  </button>
                </article>
                <article>
                  <span>MY CURRENT PLAN</span>
                  <h2>{activeEntities.length} 个正式项目</h2>
                  <p>支持加入、备选、换天、排序、自定义与撤销。</p>
                  <button onClick={() => navigate('trip')}>
                    开始编辑 <ArrowRight />
                  </button>
                </article>
              </section>
            </div>
          )}
          {view === 'trip' && (
            <TripView
              selectedDay={selectedDay}
              setSelectedDay={(day) => {
                setSelectedDay(day);
                writeUrl({ view: 'trip', day, tab: null, city: null });
              }}
              resolve={resolve}
              entities={entities}
              actions={actions}
              open={setLightbox}
              clock={clock}
              addCustom={addCustom}
              preferredTransport={preferredTransport}
              tomorrowAction={nextAction?.title}
              bookingStatuses={bookingStatuses}
              actionStatuses={displayActionStatuses}
              privateLinks={privateLinks}
            />
          )}{' '}
          {view === 'discover' && (
            <DiscoverView
              selectedDay={selectedDay}
              entities={entities}
              resolve={resolve}
              actions={actions}
              open={setLightbox}
              favorites={favorites}
              setFavorites={setFavorites}
              deleteCustom={deleteCustom}
              tab={discoverTab}
              setTab={(tab) => {
                setDiscoverTab(tab);
                writeUrl({
                  view: 'discover',
                  tab,
                  city: discoverCity,
                  day: null,
                });
              }}
              city={discoverCity}
              setCity={(city) => {
                setDiscoverCity(city);
                writeUrl({
                  view: 'discover',
                  tab: discoverTab,
                  city,
                  day: null,
                });
              }}
            />
          )}{' '}
          {view === 'plan' && (
            <PlanView
              tab={planTab}
              setTab={(tab) => {
                setPlanTab(tab);
                writeUrl({ view: 'plan', tab, day: null, city: null });
              }}
              bookingStatuses={bookingStatuses}
              setBookingStatuses={setBookingStatuses}
              actionStatuses={displayActionStatuses}
              setActionStatuses={setActionStatuses}
              actuals={actuals}
              setActuals={setActuals}
              budgetState={budgetState}
              preferredTransport={preferredTransport}
              setPreferredTransport={setPreferredTransport}
              privateLinks={privateLinks}
              setPrivateLinks={setPrivateLinks}
            />
          )}{' '}
          {view === 'more' && (
            <MoreView
              tab={moreTab}
              setTab={(tab) => {
                setMoreTab(tab);
                writeUrl({
                  view: 'more',
                  tab: tab === 'map' ? 'routes' : tab,
                  day: selectedDay,
                  city: null,
                });
              }}
              selectedDay={selectedDay}
              setSelectedDay={(day) => {
                setSelectedDay(day);
                writeUrl({
                  view: 'more',
                  tab: moreTab === 'map' ? 'routes' : moreTab,
                  day,
                  city: null,
                });
              }}
              backup={backup}
              importBackup={importBackup}
              notes={notes}
              setNotes={setNotes}
              actions={actions}
              resolve={resolve}
              privateLinks={privateLinks}
            />
          )}
        </div>
      </main>
      <nav className="bottom-nav">
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={view === id ? 'active' : ''}
            onClick={() => navigate(id)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {actions.undo && (
        <button className="undo-toast" onClick={actions.undoLast}>
          <Undo2 />
          撤销：{actions.undo.label}
        </button>
      )}
      <Lightbox image={lightbox} close={() => setLightbox(null)} />
    </div>
  );
}
