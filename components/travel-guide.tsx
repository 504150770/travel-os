'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  ArrowRight,
  BedDouble,
  BookOpen,
  CalendarCheck,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Dumbbell,
  ExternalLink,
  Gauge,
  Home,
  Hotel,
  Info,
  Landmark,
  Languages,
  Luggage,
  Map,
  MapPinned,
  Menu,
  Moon,
  PhoneCall,
  Plane,
  Route,
  Shield,
  ShoppingBag,
  Sparkles,
  SunMedium,
  TicketCheck,
  Train,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import { guideData, gymMap, placeMap } from '@/lib/data';
import type { Booking, Day, Gym, Hotel as HotelType, Place, PlaceOption, ViewId } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { MiniRoute } from '@/components/mini-route';

const views: { id: ViewId; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'HOME', icon: Home },
  { id: 'trip', label: 'TRIP MODE', icon: Route },
  { id: 'visual', label: 'VISUAL', icon: Camera },
  { id: 'picks', label: 'PICKS', icon: Landmark },
  { id: 'gym', label: 'GYM', icon: Dumbbell },
  { id: 'stay', label: 'STAY', icon: BedDouble },
  { id: 'bookings', label: 'BOOKINGS', icon: TicketCheck },
  { id: 'budget', label: 'BUDGET', icon: WalletCards },
  { id: 'checklist', label: 'CHECKLIST', icon: ClipboardCheck },
  { id: 'essentials', label: 'ESSENTIALS', icon: Luggage },
  { id: 'map', label: 'MAP', icon: MapPinned },
];

const mobilePrimary: ViewId[] = ['home', 'trip', 'visual', 'bookings'];
const iconMap: Record<string, LucideIcon> = { Luggage, ShoppingBag, Shield, Train, Languages, PhoneCall };
const pageLoadedAt = Date.now();

function yuan(value: number) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(value);
}

function shortDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(`${date}T12:00:00`));
}

function mapLinks(place: Place) {
  const query = encodeURIComponent(place.mapQuery);
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${query}`,
    apple: `https://maps.apple.com/?q=${query}`,
    xhs: `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(`${place.name} 机位`)}`,
  };
}

function RiskPill({ risk }: { risk: string }) {
  const level = risk.includes('高') ? 'high' : risk.includes('中风险') ? 'medium' : 'low';
  return <span className={`risk-pill ${level}`}>{risk}</span>;
}

function Meter({ value, max, danger = false }: { value: number; max: number; danger?: boolean }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return <div className="meter"><span style={{ width: `${percent}%` }} className={danger ? 'danger' : ''} /></div>;
}

function SectionHeading({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  return (
    <header className="section-heading">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      {note && <p>{note}</p>}
    </header>
  );
}

function HomeView({ setView, actualSpent, nextTask }: { setView: (view: ViewId) => void; actualSpent: number; nextTask?: { title: string; due: string; note: string } }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(`${guideData.trip.startDate}T00:00:00`).getTime() - pageLoadedAt) / 86400000));
  return (
    <div className="view home-view">
      <section className="home-hero">
        <Image src="/images/cover_graben.webp" alt="维也纳冬季灯饰街景" fill priority sizes="(max-width: 760px) 100vw, calc(100vw - 190px)" />
        <div className="hero-wash" />
        <div className="hero-copy">
          <span className="hero-kicker">WINTER EUROPE · 2026</span>
          <h1>把时间留在<br />喜欢的地方。</h1>
          <p>罗马出发，巴黎收尾。18天、6座城市、15个夜晚。</p>
          <button onClick={() => setView('trip')} className="hero-button">进入 Trip Mode <ArrowRight size={17} /></button>
        </div>
        <div className="countdown"><strong>{daysLeft}</strong><span>天后出发</span></div>
      </section>

      <section className="route-strip" aria-label="城市路线">
        {guideData.trip.cities.map((city, index) => (
          <div key={city.id} className="route-city">
            <span style={{ background: city.accent }} />
            <div><strong>{city.name}</strong><small>{city.nights}晚</small></div>
            {index < guideData.trip.cities.length - 1 && <ChevronRight size={16} />}
          </div>
        ))}
      </section>

      <section className="home-grid">
        <article className="editorial-card next-card">
          <div className="card-topline"><span>NEXT MOVE</span><CalendarCheck size={18} /></div>
          <h2>{nextTask?.title ?? '所有清单已完成'}</h2>
          <p>{nextTask?.note ?? '出发前72小时再做一次动态复核。'}</p>
          <div className="due-line"><b>截止</b><span>{nextTask?.due ?? '11/28'}</span></div>
          <button onClick={() => setView('checklist')} className="text-button">打开总控清单 <ArrowRight size={15} /></button>
        </article>

        <article className="editorial-card budget-card">
          <div className="card-topline"><span>BUDGET NOW</span><WalletCards size={18} /></div>
          <div className="budget-amount"><strong>{yuan(guideData.budget.hardCap - actualSpent)}</strong><span>硬预算内剩余</span></div>
          <Meter value={actualSpent} max={guideData.budget.hardCap} danger={actualSpent > guideData.budget.targetMax} />
          <div className="budget-row"><span>已记实际 {yuan(actualSpent)}</span><span>目标上限 {yuan(guideData.budget.targetMax)}</span></div>
          <button onClick={() => setView('budget')} className="text-button">管理实际支出 <ArrowRight size={15} /></button>
        </article>

        <article className="editorial-card quick-card">
          <div className="card-topline"><span>10-SECOND ACCESS</span><Sparkles size={18} /></div>
          <div className="quick-actions">
            <button onClick={() => setView('trip')}><Route /><span>今日路线</span></button>
            <button onClick={() => setView('bookings')}><TicketCheck /><span>票券状态</span></button>
            <button onClick={() => setView('map')}><Map /><span>打开地图</span></button>
            <button onClick={() => setView('stay')}><Moon /><span>静音酒店</span></button>
          </div>
        </article>
      </section>

      <section className="home-note">
        <BookOpen size={19} />
        <p><strong>行程册负责想象，Web Guide负责现场。</strong> 每个Day只保留下一步、地图、票券和止损线；动态信息在出发前72小时复核。</p>
      </section>
    </div>
  );
}

function TripView({ selectedDay, setSelectedDay }: { selectedDay: number; setSelectedDay: (day: number) => void }) {
  const day = guideData.days[selectedDay - 1] as Day;
  const dayGyms = day.gymIds.map((id) => gymMap.get(id)).filter(Boolean) as Gym[];
  const dayOptions = (guideData.options as PlaceOption[]).filter((option) => option.recommendedDays.includes(day.day)).slice(0, 3);
  return (
    <div className="view trip-view">
      <div className="trip-day-rail" aria-label="切换日期">
        {guideData.days.map((item) => (
          <button key={item.day} className={item.day === selectedDay ? 'active' : ''} onClick={() => setSelectedDay(item.day)}>
            <b>D{String(item.day).padStart(2, '0')}</b><span>{item.city.split(' → ').at(-1)}</span><small>{shortDate(item.date)}</small>
          </button>
        ))}
      </div>

      <section className="trip-head">
        <div>
          <span>DAY {String(day.day).padStart(2, '0')} · {shortDate(day.date)}</span>
          <h1>{day.theme}</h1>
          <p>{day.summary}</p>
        </div>
        <div className="trip-place"><MapPinText />{day.city}</div>
      </section>

      <section className="day-stats">
        <div><Route /><span>步行</span><strong>{day.walking}</strong></div>
        <div><Gauge /><span>疲劳</span><strong className="fatigue">{[1,2,3,4,5].map((dot) => <i key={dot} className={dot <= day.fatigue ? 'on' : ''} />)}</strong></div>
        <div><SunMedium /><span>Golden</span><strong>{day.goldenHour}</strong></div>
        <div><Moon /><span>Blue</span><strong>{day.blueHour}</strong></div>
      </section>

      <div className="trip-columns">
        <div className="trip-main">
          <section className="panel route-panel">
            <div className="panel-title"><div><span>MINI ROUTE</span><h2>今天怎么走</h2></div><MapPinned size={20} /></div>
            <MiniRoute day={day} places={guideData.places as Place[]} />
          </section>

          <section className="panel timeline-panel">
            <div className="panel-title"><div><span>TIMELINE</span><h2>按这条线走</h2></div><Clock3 size={20} /></div>
            <div className="timeline">
              {day.timeline.map((stop, index) => {
                const place = stop.placeId ? placeMap.get(stop.placeId) as Place | undefined : undefined;
                const links = place ? mapLinks(place) : null;
                return (
                  <article className="stop-card" key={`${stop.time}-${stop.title}`}>
                    <div className="stop-index">{String(index + 1).padStart(2, '0')}</div>
                    <div className="stop-body">
                      <div className="stop-top"><span>{stop.time}</span><small>{stop.mode} · {stop.duration}</small></div>
                      <h3>{stop.title}</h3>
                      <p>{stop.note}</p>
                      <div className="stop-guard"><CircleAlert size={15} /><span>{stop.guard}</span></div>
                      <div className="stop-bottom">
                        <span className="ticket-state"><TicketCheck size={14} />{stop.ticket ?? '现场即可'}</span>
                        {links && <div className="map-actions">
                          <a href={links.google} target="_blank" rel="noreferrer">Google</a>
                          <a href={links.apple} target="_blank" rel="noreferrer">Apple</a>
                          <a href={links.xhs} target="_blank" rel="noreferrer">小红书</a>
                        </div>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="trip-aside">
          <section className="panel loss-card">
            <span>STOP-LOSS</span><h2>今天晚了怎么办</h2><p>{day.lossCut}</p>
          </section>
          <section className="panel photo-plan">
            <div className="panel-title"><div><span>PHOTO PLAN</span><h2>只拍这几张</h2></div><Camera size={20} /></div>
            {day.shooting.map((shot) => <div className="shot" key={shot.title}><b>{shot.time}</b><div><strong>{shot.title}</strong><span>{shot.note}</span></div></div>)}
          </section>
          <section className="panel day-money">
            <span>{day.budgetLabel}</span><strong>{yuan(day.dayBudget)}</strong><small>规划值；已预付交通与门票不重复计入</small>
          </section>
          <section className="panel optional-gym">
            <span>OPTIONAL GYM</span>
            {dayGyms.length ? dayGyms.map((gym) => <div key={gym.id}><Dumbbell size={15} /><b>{gym.name}</b><small>{gym.dayPass} · {gym.time}</small></div>) : <p>今天不安排训练候选。</p>}
          </section>
          <section className="panel optional-picks">
            <span>OPTIONAL PICKS</span>
            {dayOptions.length ? dayOptions.map((option) => <a key={option.id} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(option.mapQuery)}`} target="_blank" rel="noreferrer"><Landmark size={15} /><div><b>{option.name}</b><small>{option.swapRule}</small></div><ExternalLink size={13} /></a>) : <p>今天不追加现场备选。</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}

function PicksView() {
  const cities = guideData.trip.cities.map((city) => city.name);
  const [city, setCity] = useState('罗马');
  const options = (guideData.options as PlaceOption[]).filter((option) => option.city === city);
  return (
    <div className="view picks-view">
      <SectionHeading eyebrow="CITY PICKS" title="主行程之外，只留可替换选择" note="每城4个候选。它们不会自动进入Day时间轴；只有现场体力、天气或兴趣变化时才替换一个次要段。" />
      <div className="city-tabs">{cities.map((name) => <button className={name === city ? 'active' : ''} key={name} onClick={() => setCity(name)}>{name}</button>)}</div>
      <section className="pick-principle"><CircleAlert size={17} /><p><b>一次只换一个。</b> 不把备选叠加到原行程，不压缩午餐和休息。</p></section>
      <div className="picks-grid">
        {options.map((option, index) => (
          <article key={option.id}>
            <div className="pick-no">0{index + 1}</div>
            <div className="pick-head"><span>{option.kind}</span><b>Day {option.recommendedDays.join(' / ')}</b></div>
            <h2>{option.name}</h2>
            <dl><div><dt>适合</dt><dd>{option.bestFor}</dd></div><div><dt>时间</dt><dd>{option.duration}</dd></div><div><dt>票券</dt><dd>{option.booking}</dd></div><div><dt>替换规则</dt><dd>{option.swapRule}</dd></div></dl>
            <div className="pick-actions">
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(option.mapQuery)}`} target="_blank" rel="noreferrer"><MapPinned /> Google</a>
              <a href={`https://maps.apple.com/?q=${encodeURIComponent(option.mapQuery)}`} target="_blank" rel="noreferrer">Apple</a>
              <a href={`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(`${option.name} 机位`)}`} target="_blank" rel="noreferrer">小红书</a>
              <a href={option.source} target="_blank" rel="noreferrer">来源 <ExternalLink /></a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function MapPinText() { return <MapPinned size={16} />; }

function VisualView({ openImage }: { openImage: (src: string, caption: string) => void }) {
  return (
    <div className="view visual-view">
      <SectionHeading eyebrow="VISUAL EDIT" title="一张照片，只承担一个任务" note="33张真实摄影按Day归档；人物机位、环境氛围和蓝调时刻不重复铺陈。" />
      <div className="visual-grid">
        {guideData.images.map((image, index) => (
          <button key={image.id} type="button" className={`visual-card visual-${index % 5}`} onClick={() => openImage(image.file, image.caption)}>
            <Image src={image.file} alt={image.caption} fill priority={index < 4} sizes="(max-width: 760px) 100vw, (max-width: 1080px) 50vw, 34vw" />
            <span className="visual-caption">
              <div><span>DAY {String(image.day).padStart(2, '0')}</span><small>{image.bestTime}</small></div>
              <h2>{image.caption}</h2>
              <p>{image.use} · {image.credit}</p>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function GymView() {
  const ranked = [...guideData.gyms].filter((gym) => gym.photogenicRank).sort((a, b) => (a.photogenicRank ?? 99) - (b.photogenicRank ?? 99));
  return (
    <div className="view gym-view">
      <SectionHeading eyebrow="GYM PICK LIST" title="训练5–6次，现场再决定" note="暗黑、工业、高级与拍摄线条优先；Day Pass和节日营业到店前24小时复核。" />
      <section className="gym-top-five">
        <span>MOST PHOTOGENIC · TOP 5</span>
        <div>{ranked.map((gym) => <article key={gym.id}><b>0{gym.photogenicRank}</b><h3>{gym.name}</h3><p>{gym.style}</p></article>)}</div>
      </section>
      <div className="gym-grid">
        {guideData.gyms.map((gym) => (
          <article className="gym-card" key={gym.id}>
            <div className="gym-image"><Image src={gym.image} alt={`${gym.name} 力量训练区`} fill sizes="(max-width: 760px) 100vw, 50vw" /><span>{gym.tag}</span></div>
            <div className="gym-copy">
              <small>{gym.city} · DAY {gym.recommendedDays.join(' / ')}</small>
              <h2>{gym.name}</h2>
              <div className="gym-price"><strong>{gym.dayPass}</strong><span>{gym.passMethod}</span></div>
              <dl>
                <div><dt>器械</dt><dd>{gym.equipment}</dd></div>
                <div><dt>风格</dt><dd>{gym.style}</dd></div>
                <div><dt>灯光</dt><dd>{gym.lighting}</dd></div>
                <div><dt>拥挤</dt><dd>{gym.crowd}</dd></div>
                <div><dt>距离</dt><dd>{gym.distance}</dd></div>
                <div><dt>营业</dt><dd>{gym.hours}</dd></div>
              </dl>
              <div className="gym-foot"><span><Camera size={15} />{gym.photo}</span><b>{gym.time}</b></div>
              <div className="gym-links"><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gym.name)}`} target="_blank" rel="noreferrer">地图 <ExternalLink size={14} /></a><a href={gym.source} target="_blank" rel="noreferrer">核验来源 <ExternalLink size={14} /></a></div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function effectiveCity(city: string) {
  return city.startsWith('威尼斯') ? '威尼斯' : city;
}

function StayView() {
  const cities = ['罗马','佛罗伦萨','威尼斯','维也纳','布拉格','巴黎'];
  const [city, setCity] = useState('罗马');
  const hotels = (guideData.hotels.hotels as HotelType[]).filter((hotel) => effectiveCity(hotel.city) === city);
  const selected = hotels.find((hotel) => hotel.selected);
  const copyQuiet = () => navigator.clipboard?.writeText(guideData.hotels.quietRequest);
  return (
    <div className="view stay-view">
      <SectionHeading eyebrow="SLEEP FIRST" title="15晚，把睡眠排在地址前面" note="当前可退候选合计¥9,157；目标¥8,500–9,500，付款与现场税费硬上限¥10,000。" />
      <section className="selected-stays">
        {guideData.hotels.hotels.filter((hotel) => hotel.selected).map((hotel) => <div key={hotel.id}><span>{effectiveCity(hotel.city)}</span><b>{hotel.name}</b><small>{hotel.priceRefundable ? yuan(hotel.priceRefundable) : '待确认'}</small></div>)}
      </section>
      <div className="city-tabs">
        {cities.map((name) => <button className={name === city ? 'active' : ''} key={name} onClick={() => setCity(name)}>{name}</button>)}
      </div>
      {city === '威尼斯' && <section className="venice-compare"><div><span>MESTRE / MARGHERA</span><p>{guideData.hotels.veniceComparison.Mestre}</p></div><div><span>ISLAND</span><p>{guideData.hotels.veniceComparison.Island}</p></div><strong>{guideData.hotels.veniceComparison.decision}</strong></section>}
      {selected && <div className="stay-decision"><CheckCircle2 size={18} /><span>当前持有顺序</span><strong>{selected.name}</strong><p>{selected.pros}；{selected.cons}</p></div>}
      <div className="hotel-grid">
        {hotels.map((hotel, index) => (
          <article className={`hotel-card ${hotel.selected ? 'selected' : ''}`} key={hotel.id}>
            <div className="hotel-rank"><b>0{index + 1}</b><span>{hotel.role}</span><RiskPill risk={hotel.risk} /></div>
            <h2>{hotel.name}</h2>
            <div className="hotel-price"><strong>{hotel.priceRefundable ? yuan(hotel.priceRefundable) : '可退价待确认'}</strong><span>{hotel.rating}</span></div>
            <p className="hotel-meta">{hotel.openingRenovation} · {hotel.roomCondition}</p>
            <div className="noise-grid">
              <div><span>街噪</span><p>{hotel.noise.street}</p></div>
              <div><span>邻房/墙体</span><p>{hotel.noise.wall}</p></div>
              <div><span>走廊</span><p>{hotel.noise.corridor}</p></div>
              <div><span>设备低频</span><p>{hotel.noise.mechanical}</p></div>
            </div>
            <dl className="hotel-details">
              <div><dt>床</dt><dd>{hotel.bed}</dd></div><div><dt>暖气</dt><dd>{hotel.heating}</dd></div><div><dt>私卫/前台/寄存</dt><dd>{hotel.privateBathroom}；{hotel.frontDeskStorage}</dd></div><div><dt>交通</dt><dd>{hotel.transport}</dd></div>
            </dl>
            <div className="hotel-verdict"><span>＋ {hotel.pros}</span><span>− {hotel.cons}</span></div>
          </article>
        ))}
      </div>
      <section className="quiet-message"><div><span>QUIET ROOM MESSAGE</span><p>{guideData.hotels.quietRequest}</p></div><button onClick={copyQuiet}>复制英文备注</button></section>
    </div>
  );
}

function BookingsView({ bookingStatuses, setBookingStatuses }: { bookingStatuses: Record<string, string>; setBookingStatuses: (next: Record<string, string>) => void }) {
  const [filter, setFilter] = useState('全部');
  const items = guideData.bookings.items as Booking[];
  const categories = ['全部', ...Array.from(new Set(items.map((item) => item.category)))];
  const filtered = items.filter((item) => filter === '全部' || item.category === filter);
  const done = items.filter((item) => ['已付款','已完成'].includes(bookingStatuses[item.id] ?? item.status)).length;
  return (
    <div className="view bookings-view">
      <SectionHeading eyebrow="BOOKING CONTROL" title="所有订单，只看一个状态" note="动态价格和班次以付款页为准；不可退票保持后置。" />
      <section className="booking-progress"><div><strong>{done}</strong><span>/ {items.length} 已付款或完成</span></div><Meter value={done} max={items.length} /><small>状态自动保存在本机浏览器</small></section>
      <div className="filter-tabs">{categories.map((category) => <button className={category === filter ? 'active' : ''} key={category} onClick={() => setFilter(category)}>{category}</button>)}</div>
      <div className="booking-list">
        {filtered.map((item) => {
          const current = bookingStatuses[item.id] ?? item.status;
          return <article key={item.id}>
            <div className="booking-icon">{item.category.includes('机票') || item.category.includes('航班') ? <Plane /> : item.category === '铁路' ? <Train /> : item.category === '酒店' ? <Hotel /> : item.category === '签证' ? <BookOpen /> : <TicketCheck />}</div>
            <div className="booking-main"><small>{item.category} · {item.date}</small><h2>{item.title}</h2><p>{item.detail}</p></div>
            <strong className="booking-budget">{yuan(item.budget)}</strong>
            <select value={current} onChange={(event) => setBookingStatuses({ ...bookingStatuses, [item.id]: event.target.value })} aria-label={`${item.title} 状态`}>
              {guideData.bookings.statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </article>;
        })}
      </div>
    </div>
  );
}

function BudgetView({ actuals, setActuals }: { actuals: Record<string, number>; setActuals: (next: Record<string, number>) => void }) {
  const categories = guideData.budget.categories;
  const actualTotal = categories.reduce((sum, item) => sum + Number(actuals[item.id] ?? 0), 0);
  const remaining = guideData.budget.hardCap - actualTotal;
  return (
    <div className="view budget-view">
      <SectionHeading eyebrow="ONE BUDGET" title="硬预算 ¥26,000" note="目标¥23,000–25,500；购物¥1,500单列，不挤占睡眠、安全和必要交通。" />
      <section className={`budget-hero ${remaining < 0 ? 'over' : ''}`}>
        <div><span>ACTUAL SPENT</span><strong>{yuan(actualTotal)}</strong><small>当前已录入实际支出</small></div>
        <div><span>REMAINING</span><strong>{yuan(remaining)}</strong><small>距硬上限</small></div>
        <div className="budget-hero-meter"><Meter value={actualTotal} max={guideData.budget.hardCap} danger={actualTotal > guideData.budget.targetMax} /><span>计划分配 {yuan(guideData.budget.planTotal)} / 硬上限 {yuan(guideData.budget.hardCap)}</span></div>
      </section>
      <section className="budget-conflict"><CircleAlert size={18} /><div><b>资料口径已覆盖</b><p>执行表的“推荐准备¥29,000”与本次硬预算冲突；当前按最新指令执行，具体机酒价格仍待付款页确认。</p></div></section>
      <div className="budget-table">
        <div className="budget-table-head"><span>类别</span><span>计划</span><span>实际</span><span>余额</span></div>
        {categories.map((item) => {
          const actual = Number(actuals[item.id] ?? 0);
          return <div className="budget-line" key={item.id}>
            <div><strong>{item.name}</strong><small>{item.note}</small>{item.protected && <em>不可牺牲</em>}</div>
            <b>{yuan(item.budget)}</b>
            <label><span>¥</span><input type="number" min="0" inputMode="numeric" value={actual || ''} placeholder="0" onChange={(event) => setActuals({ ...actuals, [item.id]: Number(event.target.value) })} /></label>
            <strong className={actual > item.budget ? 'negative' : ''}>{yuan(item.budget - actual)}</strong>
          </div>;
        })}
      </div>
      <section className="budget-rules"><div><span>超过¥26,000怎么调</span>{guideData.budget.adjustOrder.map((rule, index) => <p key={rule}><b>0{index + 1}</b>{rule}</p>)}</div><div><span>这些不动</span>{guideData.budget.neverCut.map((rule) => <p key={rule}><Check size={15} />{rule}</p>)}</div></section>
    </div>
  );
}

function ChecklistView({ checked, setChecked }: { checked: Record<string, boolean>; setChecked: (next: Record<string, boolean>) => void }) {
  const groups = guideData.checklist.groups;
  const total = groups.flatMap((group) => group.items).length;
  const count = Object.values(checked).filter(Boolean).length;
  return (
    <div className="view checklist-view">
      <SectionHeading eyebrow="MASTER CONTROL" title="下一步，只从这里进入" note="刷新不丢；每次勾选前先核姓名、日期、取消线、行李与静音要求。" />
      <section className="check-progress"><div><strong>{count}</strong><span>/ {total} 完成</span></div><Meter value={count} max={total} /></section>
      <div className="check-groups">
        {groups.map((group) => <section key={group.id}><header><span>{group.title}</span><b>{group.items.filter((item) => checked[item.id]).length}/{group.items.length}</b></header>{group.items.map((item) => <label key={item.id} className={checked[item.id] ? 'done' : ''}><input type="checkbox" checked={Boolean(checked[item.id])} onChange={(event) => setChecked({ ...checked, [item.id]: event.target.checked })} /><i>{checked[item.id] && <Check size={15} />}</i><div><strong>{item.title}</strong><span>{item.note}</span></div><b>{item.due}</b></label>)}</section>)}
      </div>
      <section className="visa-card">
        <div className="visa-head"><BookOpen /><div><span>VISA REALITY</span><h2>唯一开关：递签当天真实状态</h2></div></div>
        <div className="visa-columns"><article><b>仍在职 · Employed</b><p>{guideData.checklist.visaReality.ifEmployed}</p></article><article><b>已离职 · Career transition</b><p>{guideData.checklist.visaReality.ifLeft}</p></article></div>
        <div className="visa-unavailable"><span>不可取得 / 不列入材料</span><p>{guideData.checklist.visaReality.unavailable.join(' · ')}</p></div>
        <div className="visa-risk"><CircleAlert size={17} />{guideData.checklist.visaReality.risk}</div>
      </section>
    </div>
  );
}

function EssentialsView() {
  const [open, setOpen] = useState('luggage');
  const copyQuiet = () => navigator.clipboard?.writeText(guideData.essentials.quietMessage);
  return (
    <div className="view essentials-view">
      <SectionHeading eyebrow="ON THE ROAD" title="现场只查必要信息" note="保持短、可扫读；动态规则在出发前7天与入境当日复核。" />
      <div className="essential-list">
        {guideData.essentials.groups.map((group) => {
          const Icon = iconMap[group.icon] ?? Info;
          const isOpen = open === group.id;
          return <section key={group.id} className={isOpen ? 'open' : ''}><button onClick={() => setOpen(isOpen ? '' : group.id)}><Icon /><strong>{group.title}</strong><ChevronDown /></button>{isOpen && <div>{group.items.map((item) => <p key={item}><Check size={15} />{item}</p>)}</div>}</section>;
        })}
      </div>
      <section className="quiet-copy"><Moon /><div><span>酒店静音英文</span><p>{guideData.essentials.quietMessage}</p></div><button onClick={copyQuiet}>复制</button></section>
    </div>
  );
}

function MapView({ selectedDay, setSelectedDay }: { selectedDay: number; setSelectedDay: (day: number) => void }) {
  const day = guideData.days[selectedDay - 1] as Day;
  const selectedHotels = guideData.hotels.hotels.filter((hotel) => hotel.selected);
  return (
    <div className="view map-view">
      <SectionHeading eyebrow="ROUTE ATLAS" title="从一条线，到今天的每一步" note="路线图离线可看；外部导航只在点击后打开Google或Apple Maps。" />
      <section className="europe-route-map">
        <div className="route-line" />
        {guideData.trip.cities.map((city, index) => <div key={city.id} style={{ left: `${8 + index * 17.3}%`, top: `${[66,54,43,27,20,8][index]}%` }}><i style={{ background: city.accent }} /><span>{city.name}</span><b>{city.nights}晚</b></div>)}
        <span className="map-watermark">EUROPE · SOUTH TO WEST</span>
      </section>
      <div className="map-layout">
        <section className="panel map-day-panel">
          <div className="map-day-select"><span>DAY</span><select value={selectedDay} onChange={(event) => setSelectedDay(Number(event.target.value))}>{guideData.days.map((item) => <option key={item.day} value={item.day}>Day {item.day} · {item.city}</option>)}</select></div>
          <h2>{day.theme}</h2><MiniRoute day={day} places={guideData.places as Place[]} />
        </section>
        <section className="map-index">
          <div><span>STAYS</span>{selectedHotels.map((hotel) => <a key={hotel.id} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.name)}`} target="_blank" rel="noreferrer"><BedDouble /><b>{effectiveCity(hotel.city)}</b><span>{hotel.name}</span><ExternalLink /></a>)}</div>
          <div><span>GYMS</span>{guideData.gyms.map((gym) => <a key={gym.id} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gym.name)}`} target="_blank" rel="noreferrer"><Dumbbell /><b>{gym.city}</b><span>{gym.name}</span><ExternalLink /></a>)}</div>
        </section>
      </div>
    </div>
  );
}

function Lightbox({ image, onClose }: { image: { src: string; caption: string } | null; onClose: () => void }) {
  if (!image) return null;
  return <dialog open className="lightbox" aria-modal="true"><button aria-label="关闭图片" onClick={onClose}><X /></button><div className="lightbox-image"><Image src={image.src} alt={image.caption} fill sizes="95vw" /></div><span>{image.caption}</span></dialog>;
}

export default function TravelGuide() {
  const [view, setView] = useState<ViewId>('home');
  const [selectedDay, setSelectedDay] = useState(1);
  const [moreOpen, setMoreOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; caption: string } | null>(null);
  const [bookingStatuses, setBookingStatuses] = useLocalStorage<Record<string, string>>('europe-guide-booking-statuses', {});
  const [checked, setChecked] = useLocalStorage<Record<string, boolean>>('europe-guide-checklist', {});
  const [actuals, setActuals] = useLocalStorage<Record<string, number>>('europe-guide-budget-actuals', {});
  const actualSpent = useMemo(() => Object.values(actuals).reduce((sum, value) => sum + Number(value || 0), 0), [actuals]);
  const nextTask = guideData.checklist.groups.flatMap((group) => group.items).find((item) => !checked[item.id]);

  const navigate = (next: ViewId) => {
    setView(next);
    setMoreOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`app-shell view-${view}`}>
      <aside className="desktop-nav">
        <button className="brand" onClick={() => navigate('home')}><span>EU</span><div><b>WINTER</b><small>TRAVEL GUIDE</small></div></button>
        <nav>{views.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => navigate(id)}><Icon /><span>{label}</span></button>)}</nav>
        <div className="rail-foot"><i /><span>DATA</span><b>AUDITED</b></div>
      </aside>

      <main className="app-main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMoreOpen(!moreOpen)} aria-label="打开导航"><Menu /></button>
          <div><span>PERSONAL EUROPE / 2026</span><b>{views.find((item) => item.id === view)?.label}</b></div>
          <p>{guideData.trip.startDate.replaceAll('-', '.')} — {guideData.trip.endDate.replaceAll('-', '.')}</p>
          <span className="sync-state"><i /> LOCAL SAVED</span>
        </header>

        {view === 'home' && <HomeView setView={navigate} actualSpent={actualSpent} nextTask={nextTask} />}
        {view === 'trip' && <TripView selectedDay={selectedDay} setSelectedDay={setSelectedDay} />}
        {view === 'visual' && <VisualView openImage={(src, caption) => setLightbox({ src, caption })} />}
        {view === 'picks' && <PicksView />}
        {view === 'gym' && <GymView />}
        {view === 'stay' && <StayView />}
        {view === 'bookings' && <BookingsView bookingStatuses={bookingStatuses} setBookingStatuses={setBookingStatuses} />}
        {view === 'budget' && <BudgetView actuals={actuals} setActuals={setActuals} />}
        {view === 'checklist' && <ChecklistView checked={checked} setChecked={setChecked} />}
        {view === 'essentials' && <EssentialsView />}
        {view === 'map' && <MapView selectedDay={selectedDay} setSelectedDay={setSelectedDay} />}
      </main>

      {moreOpen && <div className="mobile-more">
        {views.filter((item) => !mobilePrimary.includes(item.id)).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => navigate(id)}><Icon /><span>{label}</span></button>)}
      </div>}
      <nav className="mobile-nav">
        {views.filter((item) => mobilePrimary.includes(item.id)).map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => navigate(id)}><Icon /><span>{label === 'TRIP MODE' ? 'TRIP' : label}</span></button>)}
        <button className={!mobilePrimary.includes(view) ? 'active' : ''} onClick={() => setMoreOpen(!moreOpen)}><Menu /><span>MORE</span></button>
      </nav>
      <Lightbox image={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
