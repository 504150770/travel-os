'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BedDouble, Camera, Check, ChevronDown, CircleAlert,
  Clock3, Download, Dumbbell, ExternalLink, Heart, Home, ImageIcon, Info,
  MapPinned, Menu, Moon, Navigation, Route, Search,
  ShieldCheck, SunMedium, TicketCheck, Upload, Utensils, X,
} from 'lucide-react';
import { guideData, gymMap, imageByPlace, placeMap } from '@/lib/data';
import { MiniRoute } from '@/components/mini-route';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { Booking, Day, GuideImage, Gym, Hotel, Place, Restaurant, Task, ViewId, XhsTopic } from '@/lib/types';

type DiscoverTab = 'visual' | 'food' | 'xhs' | 'gym' | 'picks';
type PlanTab = 'bookings' | 'tasks' | 'budget';
type MoreTab = 'stay' | 'map' | 'essentials' | 'backup';
type LightboxImage = { src: string; caption: string } | null;

const topNav: { id: ViewId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'HOME', icon: Home },
  { id: 'trip', label: 'TRIP', icon: Route },
  { id: 'discover', label: 'DISCOVER', icon: Search },
  { id: 'plan', label: 'PLAN', icon: TicketCheck },
  { id: 'more', label: 'MORE', icon: Menu },
];
function yuan(value: number) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(value);
}

function shortDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(`${date}T12:00:00`));
}

function tripDayToday(reference: Date) {
  const start = new Date(`${guideData.trip.startDate}T00:00:00`);
  const end = new Date(`${guideData.trip.endDate}T23:59:59`);
  if (reference < start) return 1;
  if (reference > end) return 18;
  return Math.min(18, Math.max(1, Math.floor((reference.getTime() - start.getTime()) / 86400000) + 1));
}

function mapLinks(query: string, xhsKeyword?: string) {
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    apple: `https://maps.apple.com/?q=${encodeURIComponent(query)}`,
    xhs: `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(xhsKeyword ?? query)}`,
  };
}

function Header({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  return <header className="v2-heading"><span>{eyebrow}</span><h1>{title}</h1>{note && <p>{note}</p>}</header>;
}

function Verified({ date, label = 'Last verified' }: { date: string; label?: string }) {
  return <small className="verified">{label}: {date}</small>;
}

function Favorite({ id, favorites, setFavorites }: { id: string; favorites: Record<string, boolean>; setFavorites: (next: Record<string, boolean>) => void }) {
  const active = Boolean(favorites[id]);
  return <button className={`favorite ${active ? 'active' : ''}`} onClick={() => setFavorites({ ...favorites, [id]: !active })} aria-label={active ? '取消收藏' : '收藏'}><Heart size={17} fill={active ? 'currentColor' : 'none'} /></button>;
}

function Lightbox({ image, onClose }: { image: LightboxImage; onClose: () => void }) {
  if (!image) return null;
  return <dialog className="v2-lightbox" open aria-modal="true"><button onClick={onClose} aria-label="关闭"><X /></button><div><Image src={image.src} alt={image.caption} fill sizes="96vw" /></div><p>{image.caption}</p></dialog>;
}

function ImageStrip({ images, openImage, compact = false }: { images: GuideImage[]; openImage: (image: LightboxImage) => void; compact?: boolean }) {
  if (!images.length) return <div className="image-missing"><ImageIcon /><span>现场参考图待补充</span></div>;
  return <div className={`image-strip ${compact ? 'compact' : ''}`}>{images.map((image, index) => <button key={image.id} onClick={() => openImage({ src: image.file, caption: image.caption })}>
    <Image src={image.file} alt={image.caption} fill priority={!compact && index === 0} loading={!compact && index === 0 ? 'eager' : 'lazy'} sizes={compact ? '(max-width: 480px) 82vw, 420px' : '(max-width: 760px) 92vw, 720px'} />
    <span>{image.use} · {image.bestTime}</span>
  </button>)}</div>;
}

function HomeView({ navigate, actualTotal, nextTask, clock }: { navigate: (view: ViewId) => void; actualTotal: number; nextTask?: Task; clock: Date | null }) {
  const daysLeft = clock ? Math.ceil((new Date(`${guideData.trip.startDate}T00:00:00`).getTime() - clock.getTime()) / 86400000) : null;
  return <div className="v2-view home-v2">
    <section className="home-cover">
      <Image src={guideData.trip.coverImage} alt="冬季欧洲街景" fill priority sizes="100vw" />
      <div className="cover-shade" />
      <div className="cover-copy"><span>PERSONAL WINTER EUROPE · 2026</span><h1>18天，只走<br />值得记住的地方。</h1><p>罗马 → 佛罗伦萨 → 威尼斯 → 维也纳 → 布拉格 → 巴黎</p><button onClick={() => navigate('trip')}>进入 Trip Mode <ArrowRight /></button></div>
      <div className="countdown"><b>{daysLeft === null ? '—' : daysLeft > 0 ? daysLeft : tripDayToday(clock!)}</b><span>{daysLeft === null ? '行程倒计时' : daysLeft > 0 ? '天后出发' : '今日Day'}</span></div>
    </section>
    <section className="route-ribbon">{guideData.trip.cities.map((city) => <div key={city.id}><i style={{ background: city.accent }} /><b>{city.name}</b><span>{city.nights}晚</span></div>)}</section>
    <section className="home-dashboard">
      <article><span>NEXT ACTION</span><h2>{nextTask?.title ?? '当前任务已完成'}</h2><p>{nextTask?.note ?? '出发前再做动态复核。'}</p><button onClick={() => navigate('plan')}>打开 Plan <ArrowRight /></button></article>
      <article><span>BUDGET</span><h2>{yuan(guideData.budget.hardCap - actualTotal)}</h2><p>硬预算内剩余 · 已记 {yuan(actualTotal)}</p><button onClick={() => navigate('plan')}>管理支出 <ArrowRight /></button></article>
      <article><span>10-SECOND ACCESS</span><div className="quick-grid"><button onClick={() => navigate('trip')}><Route />今日路线</button><button onClick={() => navigate('discover')}><Utensils />吃什么</button><button onClick={() => navigate('plan')}><TicketCheck />订单票券</button><button onClick={() => navigate('more')}><BedDouble />今晚住宿</button></div></article>
    </section>
  </div>;
}

function StopCard({ stop, day, delay, openImage }: { stop: Day['timeline'][number]; day: Day; delay: number; openImage: (image: LightboxImage) => void }) {
  const place = stop.placeId ? placeMap.get(stop.placeId) as Place | undefined : undefined;
  const images = stop.placeId ? (imageByPlace.get(stop.placeId) ?? []) as GuideImage[] : [];
  const links = place ? mapLinks(place.mapQuery, `${place.name} 拍照 攻略`) : null;
  return <article className="trip-stop">
    <div className="stop-time"><b>{stop.time}</b><span>{stop.duration}</span></div>
    <div className="stop-content">
      <div className="stop-title"><div><small>{stop.mode}</small><h3>{stop.title}</h3></div><span className="ticket-chip"><TicketCheck />{stop.ticket ?? '现场即可'}</span></div>
      {images.length > 0 && <ImageStrip images={images.slice(0, 3)} openImage={openImage} compact />}
      <p>{stop.note}</p>
      <details><summary>现场执行与拍摄 <ChevronDown /></summary><div className="stop-details"><p><Navigation />怎么过去：{stop.mode}；从上一站按 Mini Route 导航。</p><p><Camera />拍摄：{images[0]?.composition ?? day.shooting.find((shot) => shot.title.includes(stop.title.slice(0, 2)))?.note ?? '先拍环境全景，再决定人物站位。'}</p><p><CircleAlert />边界：{stop.guard}</p></div></details>
      {links && <div className="action-row"><a href={links.google} target="_blank" rel="noreferrer">Google</a><a href={links.apple} target="_blank" rel="noreferrer">Apple</a><a href={links.xhs} target="_blank" rel="noreferrer">小红书攻略</a></div>}
      {delay >= 60 && <div className="inline-loss"><CircleAlert />晚{delay}分钟：优先执行上方票券与边界，次要慢逛按今日止损卡删除。</div>}
    </div>
  </article>;
}

function FoodMini({ items, favorites, setFavorites }: { items: Restaurant[]; favorites: Record<string, boolean>; setFavorites: (next: Record<string, boolean>) => void }) {
  const mustEats = Array.from(new Set(items.map((item) => item.mustEat))).slice(0, 3);
  return <section className="trip-food section-card"><div className="section-title"><div><span>FOOD NEAR ROUTE</span><h2>今天吃什么</h2></div><Utensils /></div>
    <div className="must-eat">TODAY&apos;S MUST EAT <b>{mustEats.join(' / ')}</b></div>
    <div className="food-mini-grid">{items.slice(0, 4).map((item) => { const links = mapLinks(item.mapQuery, item.xhsKeyword); return <article key={item.id}><Favorite id={`food:${item.id}`} favorites={favorites} setFavorites={setFavorites} /><small>{item.meal} · {item.price}</small><h3>{item.name}</h3><p>{item.dishes}</p><span>{item.distance}</span><div className="action-row"><a href={links.google} target="_blank" rel="noreferrer">地图</a><a href={links.xhs} target="_blank" rel="noreferrer">小红书</a><a href={item.source} target="_blank" rel="noreferrer">来源</a></div></article>})}</div>
  </section>;
}

function TripView({ selectedDay, setSelectedDay, openImage, favorites, setFavorites, clock }: { selectedDay: number; setSelectedDay: (day: number) => void; openImage: (image: LightboxImage) => void; favorites: Record<string, boolean>; setFavorites: (next: Record<string, boolean>) => void; clock: Date | null }) {
  const day = guideData.days[selectedDay - 1] as Day;
  const dayImages = (guideData.images as GuideImage[]).filter((image) => image.dayId === day.day);
  const dayRestaurants = (guideData.restaurants as Restaurant[]).filter((item) => item.recommendedDays.includes(day.day)).sort((a,b)=>Number(Boolean(favorites[`food:${b.id}`]))-Number(Boolean(favorites[`food:${a.id}`])));
  const gyms = day.gymIds.map((id) => gymMap.get(id)).filter(Boolean) as Gym[];
  const [delay, setDelay] = useState(0);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const stayCity = day.day >= 2 && day.day <= 4 ? '罗马' : day.day <= 6 ? '佛罗伦萨' : day.day <= 8 ? '威尼斯' : day.day <= 10 ? '维也纳' : day.day <= 12 ? '布拉格' : day.day <= 16 ? '巴黎' : null;
  const selectedHotel = stayCity ? (guideData.hotels.hotels as Hotel[]).find((hotel) => hotel.selected && (hotel.city.startsWith('威尼斯') ? '威尼斯' : hotel.city) === stayCity) : undefined;
  return <div className="v2-view trip-v2">
    <div className="day-switcher">{guideData.days.map((item) => <button key={item.day} className={item.day === selectedDay ? 'active' : ''} onClick={() => setSelectedDay(item.day)}><b>D{item.day}</b><span>{item.city.split(' → ').at(-1)}</span></button>)}</div>
    <div className="day-controls"><button disabled={selectedDay===1} onClick={()=>setSelectedDay(selectedDay-1)}><ArrowLeft />上一天</button><button onClick={()=>setSelectedDay(tripDayToday(clock ?? new Date()))}>TODAY · D{tripDayToday(clock ?? new Date())}</button><button disabled={selectedDay===18} onClick={()=>setSelectedDay(selectedDay+1)}>下一天<ArrowRight /></button></div>
    <section className="day-hero">{dayImages[0] && <Image src={dayImages[0].file} alt={dayImages[0].caption} fill priority sizes="100vw" />}<div className="day-hero-shade"/><div><span>DAY {String(day.day).padStart(2,'0')} · {shortDate(day.date)}</span><h1>{day.theme}</h1><p>{day.city} · {day.pace} · {day.walking}</p></div></section>
    <section className="trip-glance"><div><Route /><span>步行</span><b>{day.walking}</b></div><div><Clock3 /><span>节奏</span><b>{day.pace}</b></div><div><SunMedium /><span>Golden</span><b>{day.goldenHour}</b></div><div><Moon /><span>Blue</span><b>{day.blueHour}</b></div><button onClick={()=>setWeatherOpen(!weatherOpen)}><Info /><span>天气</span><b>{weatherOpen?'出发前72h复核':'预留'}</b></button></section>
    <div className="trip-layout"><main>
      <section className="section-card"><div className="section-title"><div><span>MINI ROUTE</span><h2>今天怎么走</h2></div><MapPinned /></div><MiniRoute day={day} places={guideData.places as Place[]} /></section>
      <section className="section-card"><div className="section-title"><div><span>TIMELINE + PHOTOS</span><h2>按这条线执行</h2></div><Camera /></div><div className="stop-list">{day.timeline.map((stop)=><StopCard key={`${stop.time}-${stop.title}`} stop={stop} day={day} delay={delay} openImage={openImage}/>)}</div></section>
      {dayRestaurants.length > 0 && <FoodMini items={dayRestaurants} favorites={favorites} setFavorites={setFavorites}/>} 
    </main><aside>
      <section className="loss-panel"><span>RUNNING LATE?</span><h2>晚了就删，不追进度</h2><div className="delay-tabs">{[0,30,60,90].map((minutes)=><button key={minutes} className={delay===minutes?'active':''} onClick={()=>setDelay(minutes)}>{minutes===0?'准时':`+${minutes}m`}</button>)}</div><p>{delay===0?'按原计划执行，仍保留完整午餐和休息。':delay===30?`晚30分钟：先压缩拍摄等待，不动已付费核心项目。${day.lossCut}`:delay===60?`晚60分钟：${day.lossCut}`:`晚90分钟：只保留已付费核心项目和一处代表性室外地标。${day.lossCut}`}</p></section>
      <section className="section-card"><span>PHOTO PLAN</span>{day.shooting.map((shot)=><div className="shot-row" key={shot.title}><b>{shot.time}</b><p><strong>{shot.title}</strong>{shot.note}</p></div>)}</section>
      <section className="section-card"><span>OPTIONAL GYM</span>{gyms.length?gyms.map((gym)=>{const links=mapLinks(gym.name,`${gym.city} ${gym.name} 健身房`);return <article className="gym-mini" key={gym.id}><Favorite id={`gym:${gym.id}`} favorites={favorites} setFavorites={setFavorites}/><Dumbbell/><div><b>{gym.name}</b><span>{gym.dayPass} · {gym.time}</span></div><a href={links.google} target="_blank" rel="noreferrer">导航</a></article>}):<p className="muted">今天不设训练候选。</p>}</section>
      <section className="day-budget"><span>TODAY BUDGET</span><b>{yuan(day.dayBudget)}</b><small>可变支出规划值</small></section>
      <section className="return-card"><Moon/><div><span>{selectedHotel ? 'RETURN HOTEL' : 'END OF DAY'}</span><b>{selectedHotel?.name ?? '按转场票面执行'}</b><p>{selectedHotel ? `${day.fatigue>=4?'建议20:00前回酒店':'建议21:00前回酒店'}；体力差时直接打车。` : '不额外追加项目；优先完成交通与休息。'}</p></div></section>
    </aside></div>
  </div>;
}

function VisualPanel({ openImage, favorites, setFavorites }: { openImage:(image:LightboxImage)=>void; favorites:Record<string,boolean>; setFavorites:(next:Record<string,boolean>)=>void }) {
  const [filter,setFilter]=useState('ALL');
  const images=guideData.images as GuideImage[];
  const filters=['ALL','portrait','architecture','interior','night'];
  const shown=filter==='ALL'?images:images.filter((image)=>image.type===filter);
  return <div><div className="filter-row">{filters.map((item)=><button className={filter===item?'active':''} key={item} onClick={()=>setFilter(item)}>{item}</button>)}</div><div className="visual-grid">{shown.map((image)=><article key={image.id}><button className="visual-image" onClick={()=>openImage({src:image.file,caption:image.caption})}><Image src={image.file} alt={image.caption} fill loading="lazy" sizes="(max-width: 680px) 50vw, 28vw"/></button><Favorite id={`photo:${image.id}`} favorites={favorites} setFavorites={setFavorites}/><span>DAY {image.dayId} · {image.type}</span><h3>{image.caption}</h3><p>{image.focalLength} · {image.composition}</p><Verified date={image.lastVerified}/></article>)}</div></div>;
}

function FoodPanel({ favorites,setFavorites }: { favorites:Record<string,boolean>; setFavorites:(next:Record<string,boolean>)=>void }) {
  const [city,setCity]=useState('罗马'); const items=(guideData.restaurants as Restaurant[]).filter((item)=>item.city===city);
  return <div><div className="city-row">{guideData.trip.cities.map((item)=><button className={city===item.name?'active':''} key={item.id} onClick={()=>setCity(item.name)}>{item.name}</button>)}</div><div className="food-grid">{items.map((item)=>{const links=mapLinks(item.mapQuery,item.xhsKeyword);return <article key={item.id}><div className="food-photo-pending"><Utensils/><span>{item.photoStatus}</span></div><Favorite id={`food:${item.id}`} favorites={favorites} setFavorites={setFavorites}/><small>{item.meal} · {item.price}</small><h2>{item.name}</h2><div className="must-dish"><b>MUST EAT</b>{item.dishes}</div><dl><div><dt>营业</dt><dd>{item.hours}</dd></div><div><dt>顺路</dt><dd>{item.distance}</dd></div><div><dt>预约</dt><dd>{item.reservation}</dd></div><div><dt>独自</dt><dd>{item.soloFriendly}</dd></div></dl><div className="action-row"><a href={links.google} target="_blank" rel="noreferrer">Google</a><a href={links.apple} target="_blank" rel="noreferrer">Apple</a><a href={links.xhs} target="_blank" rel="noreferrer">小红书</a><a href={item.source} target="_blank" rel="noreferrer">来源</a></div><Verified date={item.lastVerified}/></article>})}</div></div>;
}

function XhsPanel() { const [category,setCategory]=useState('ALL'); const topics=guideData.xhs as XhsTopic[]; const categories=['ALL',...Array.from(new Set(topics.map((item)=>item.category)))]; const shown=category==='ALL'?topics:topics.filter((item)=>item.category===category); return <div><div className="filter-row">{categories.map((item)=><button className={category===item?'active':''} key={item} onClick={()=>setCategory(item)}>{item}</button>)}</div><div className="xhs-grid">{shown.map((item)=><a key={item.id} href={item.url} target="_blank" rel="noreferrer"><span>{item.city} · {item.category}</span><h3>{item.keyword}</h3><p>{item.linkType}，不伪造作者、点赞量或笔记地址。</p><ExternalLink/></a>)}</div></div> }

function GymPanel({ favorites,setFavorites }: { favorites:Record<string,boolean>; setFavorites:(next:Record<string,boolean>)=>void }) { const gyms=guideData.gyms as Gym[]; return <div className="gym-zone"><div className="gym-top">MOST PHOTOGENIC GYMS {gyms.filter((g)=>g.photogenicRank).sort((a,b)=>(a.photogenicRank??9)-(b.photogenicRank??9)).map((g)=><b key={g.id}>0{g.photogenicRank} {g.name}</b>)}</div><div className="gym-grid-v2">{gyms.map((gym)=>{const links=mapLinks(gym.name,`${gym.city} ${gym.name} 健身房`);return <article key={gym.id}><div className="gym-img"><Image src={gym.image} alt={gym.name} fill loading="lazy" sizes="(max-width:680px) 90vw, 40vw"/></div><Favorite id={`gym:${gym.id}`} favorites={favorites} setFavorites={setFavorites}/><small>{gym.city} · DAY {gym.recommendedDays.join('/')}</small><h2>{gym.name}</h2><p>{gym.style} · {gym.lighting}</p><dl><div><dt>Day Pass</dt><dd>{gym.dayPass}</dd></div><div><dt>器械</dt><dd>{gym.equipment}</dd></div><div><dt>拍摄</dt><dd>{gym.photo}</dd></div><div><dt>时段</dt><dd>{gym.time}</dd></div></dl><div className="action-row"><a href={links.google} target="_blank" rel="noreferrer">地图</a><a href={links.xhs} target="_blank" rel="noreferrer">小红书</a><a href={gym.source} target="_blank" rel="noreferrer">来源</a></div><Verified date="2026-09-06"/></article>})}</div></div> }

function PicksPanel() { const [city,setCity]=useState('罗马'); const items=guideData.options.filter((item)=>item.city===city); return <div><div className="city-row">{guideData.trip.cities.map((item)=><button className={city===item.name?'active':''} key={item.id} onClick={()=>setCity(item.name)}>{item.name}</button>)}</div><div className="pick-grid">{items.map((item)=><article key={item.id}><span>{item.kind} · DAY {item.recommendedDays.join('/')}</span><h2>{item.name}</h2><p>{item.bestFor}</p><b>{item.swapRule}</b><div className="action-row"><a href={mapLinks(item.mapQuery).google} target="_blank" rel="noreferrer">地图</a><a href={mapLinks(item.mapQuery,`${item.name} 攻略`).xhs} target="_blank" rel="noreferrer">小红书</a><a href={item.source} target="_blank" rel="noreferrer">来源</a></div></article>)}</div></div> }

function DiscoverView({ tab,setTab,openImage,favorites,setFavorites }: { tab:DiscoverTab;setTab:(tab:DiscoverTab)=>void;openImage:(image:LightboxImage)=>void;favorites:Record<string,boolean>;setFavorites:(next:Record<string,boolean>)=>void }) { const labels:{id:DiscoverTab;label:string}[]=[{id:'visual',label:'PHOTO GUIDE'},{id:'food',label:'FOOD'},{id:'xhs',label:'XHS GUIDE'},{id:'gym',label:'GYM'},{id:'picks',label:'PICKS'}]; return <div className="v2-view"><Header eyebrow="DISCOVER" title="出发前研究，现场按需深入" note="Trip Mode已包含每天最有用的照片、餐饮、导航与GYM；这里保留完整灵感库。"/><div className="subnav">{labels.map((item)=><button key={item.id} className={tab===item.id?'active':''} onClick={()=>setTab(item.id)}>{item.label}</button>)}</div>{tab==='visual'&&<VisualPanel openImage={openImage} favorites={favorites} setFavorites={setFavorites}/>} {tab==='food'&&<FoodPanel favorites={favorites} setFavorites={setFavorites}/>} {tab==='xhs'&&<XhsPanel/>} {tab==='gym'&&<GymPanel favorites={favorites} setFavorites={setFavorites}/>} {tab==='picks'&&<PicksPanel/>}</div> }

function BookingPanel({ statuses,setStatuses,edits,setEdits }: { statuses:Record<string,string>;setStatuses:(v:Record<string,string>)=>void;edits:Record<string,Partial<Booking>>;setEdits:(v:Record<string,Partial<Booking>>)=>void }) { const items=guideData.bookings.items as Booking[]; const update=(id:string,key:keyof Booking,value:string)=>setEdits({...edits,[id]:{...edits[id],[key]:value}}); return <div className="booking-v2">{items.map((base)=>{const item={...base,...edits[base.id]};const status=statuses[item.id]??item.status;return <details key={item.id}><summary><div><span>{item.category} · {item.date}</span><h3>{item.title}</h3><p>{item.detail}</p></div><b>{yuan(item.budget)}</b><select value={status} onClick={(e)=>e.stopPropagation()} onChange={(e)=>setStatuses({...statuses,[item.id]:e.target.value})}>{guideData.bookings.statuses.map((s)=><option key={s}>{s}</option>)}</select><ChevronDown/></summary><div className="booking-fields">{[['supplier','供应商'],['orderNumber','订单号'],['cancellationDeadline','取消截止'],['serviceNumber','航班/车次'],['stationAirport','机场/车站'],['baggage','行李'],['contact','联系人'],['notes','备注']] .map(([key,label])=><label key={key}><span>{label}</span><input value={String(item[key as keyof Booking]??'')} onChange={(e)=>update(item.id,key as keyof Booking,e.target.value)} placeholder="待填写"/></label>)}</div><Verified date={item.lastVerified}/></details>})}</div> }

function TaskPanel({ statuses,setStatuses,bookingStatuses }: { statuses:Record<string,string>;setStatuses:(v:Record<string,string>)=>void;bookingStatuses:Record<string,string> }) { const tasks=guideData.tasks.items as Task[]; return <div className="task-v2">{tasks.map((task)=>{const bookingStatus=task.linkedBookingId?bookingStatuses[task.linkedBookingId]:undefined;const synced=Boolean(bookingStatus&&task.autoCompleteWhen.includes(bookingStatus));const current=synced?'Done':(statuses[task.id]??task.status);return <article className={current==='Done'?'done':''} key={task.id}><button onClick={()=>!synced&&setStatuses({...statuses,[task.id]:current==='Done'?'To Do':'Done'})}><i>{current==='Done'&&<Check/>}</i></button><div><span>{task.group} · {task.due}</span><h3>{task.title}</h3><p>{task.note}</p>{synced&&<small>已由对应Booking状态自动完成</small>}</div><select disabled={synced} value={current} onChange={(e)=>setStatuses({...statuses,[task.id]:e.target.value})}>{guideData.tasks.statuses.map((s)=><option key={s}>{s}</option>)}</select></article>})}</div> }

function BudgetPanel({ actuals,setActuals }: { actuals:Record<string,number>;setActuals:(v:Record<string,number>)=>void }) { const categories=guideData.budget.categories;const actual=categories.reduce((s,i)=>s+Number(actuals[i.id]??0),0);const expected=categories.reduce((s,i)=>s+(actuals[i.id]===undefined?i.budget:Number(actuals[i.id])),0);return <div><section className="budget-summary"><div><span>PLANNED</span><b>{yuan(guideData.budget.planTotal)}</b></div><div><span>ACTUAL</span><b>{yuan(actual)}</b></div><div><span>REMAINING</span><b>{yuan(guideData.budget.hardCap-actual)}</b></div><div><span>EXPECTED FINAL</span><b>{yuan(expected)}</b></div></section><div className="budget-lines">{categories.map((item)=>{const value=actuals[item.id];return <label key={item.id}><div><b>{item.name}</b><span>{item.note}</span></div><strong>{yuan(item.budget)}</strong><input type="number" inputMode="numeric" placeholder="实际" value={value??''} onChange={(e)=>setActuals({...actuals,[item.id]:Number(e.target.value)})}/><em>{yuan(item.budget-Number(value??0))}</em></label>})}</div><p className="budget-rule"><ShieldCheck/>硬上限¥26,000；酒店最高¥10,000，购物至少¥1,500。睡眠、安全、私卫、暖气、23kg托运行李、保险和核心景点不压缩。</p></div> }

function PlanView({ tab,setTab,bookingStatuses,setBookingStatuses,taskStatuses,setTaskStatuses,actuals,setActuals,bookingEdits,setBookingEdits }: { tab:PlanTab;setTab:(t:PlanTab)=>void;bookingStatuses:Record<string,string>;setBookingStatuses:(v:Record<string,string>)=>void;taskStatuses:Record<string,string>;setTaskStatuses:(v:Record<string,string>)=>void;actuals:Record<string,number>;setActuals:(v:Record<string,number>)=>void;bookingEdits:Record<string,Partial<Booking>>;setBookingEdits:(v:Record<string,Partial<Booking>>)=>void }) { return <div className="v2-view"><Header eyebrow="PLAN / CONTROL" title="订单与任务只维护一份状态" note="Booking负责真实订单；Task负责执行动作。关联任务会随订单状态自动完成。"/><div className="subnav"><button className={tab==='bookings'?'active':''} onClick={()=>setTab('bookings')}>BOOKINGS</button><button className={tab==='tasks'?'active':''} onClick={()=>setTab('tasks')}>TASKS</button><button className={tab==='budget'?'active':''} onClick={()=>setTab('budget')}>BUDGET</button></div>{tab==='bookings'&&<BookingPanel statuses={bookingStatuses} setStatuses={setBookingStatuses} edits={bookingEdits} setEdits={setBookingEdits}/>} {tab==='tasks'&&<TaskPanel statuses={taskStatuses} setStatuses={setTaskStatuses} bookingStatuses={bookingStatuses}/>} {tab==='budget'&&<BudgetPanel actuals={actuals} setActuals={setActuals}/>}</div> }

function Risk({ value }: { value:string }) { const level=value.includes('高')?'high':value.includes('中')?'medium':'low'; return <span className={`risk ${level}`}>{value}</span> }

function StayPanel({ favorites,setFavorites,openImage }: { favorites:Record<string,boolean>;setFavorites:(v:Record<string,boolean>)=>void;openImage:(image:LightboxImage)=>void }) { const [city,setCity]=useState('罗马');const hotels=(guideData.hotels.hotels as Hotel[]).filter((hotel)=>(hotel.city.startsWith('威尼斯')?'威尼斯':hotel.city)===city);return <div><div className="city-row">{guideData.trip.cities.map((item)=><button className={city===item.name?'active':''} key={item.id} onClick={()=>setCity(item.name)}>{item.name}</button>)}</div>{city==='威尼斯'&&<div className="venice-choice"><b>MESTRE PRIORITY</b><p>{guideData.hotels.veniceComparison.Mestre}</p><span>{guideData.hotels.veniceComparison.decision}</span></div>}<div className="hotel-grid-v2">{hotels.map((hotel,index)=><article key={hotel.id}><Favorite id={`hotel:${hotel.id}`} favorites={favorites} setFavorites={setFavorites}/><div className="hotel-head"><span>0{index+1} · {hotel.role}</span><Risk value={hotel.risk}/><h2>{hotel.name}</h2><strong>{hotel.priceRefundable?yuan(hotel.priceRefundable):'可退价待确认'}</strong><p>{hotel.roomName}</p></div><div className="room-carousel">{hotel.roomImages.map((photo)=><div key={photo.id}>{photo.file?<button onClick={()=>openImage({src:photo.file!,caption:photo.caption})}><Image src={photo.file} alt={photo.caption} fill sizes="80vw"/></button>:<div className="room-pending"><BedDouble/><b>{photo.caption}</b><span>{photo.status}</span></div>}</div>)}</div><dl><div><dt>面积 / 床</dt><dd>{hotel.roomArea} · {hotel.bedType}</dd></div><div><dt>评分</dt><dd>{hotel.rating} · {hotel.ratingCount}条评价</dd></div><div><dt>暖气 / 空调</dt><dd>{hotel.heating}；{hotel.airConditioning}</dd></div><div><dt>前台 / 晚到</dt><dd>{hotel.frontDesk}；{hotel.lateArrival}</dd></div><div><dt>私卫 / 寄存</dt><dd>{hotel.privateBathroom}；{hotel.luggageStorage}</dd></div><div><dt>交通</dt><dd>{hotel.transport}</dd></div></dl><div className="noise-matrix">{Object.entries(hotel.noise).map(([key,value])=><p key={key}><b>{key}</b><span>{value}</span></p>)}</div><p className="price-source">{hotel.priceSource}</p><Verified date={hotel.lastVerified}/></article>)}</div></div> }

function MapPanel({ selectedDay,setSelectedDay }: { selectedDay:number;setSelectedDay:(d:number)=>void }) { const day=guideData.days[selectedDay-1] as Day;return <div className="map-v2"><label>选择Day<select value={selectedDay} onChange={(e)=>setSelectedDay(Number(e.target.value))}>{guideData.days.map((d)=><option key={d.day} value={d.day}>Day {d.day} · {d.city}</option>)}</select></label><MiniRoute day={day} places={guideData.places as Place[]}/><p>Trip Mode已同时显示当天酒店、Stops、餐厅与可选Gym；这里保留整趟索引。</p></div> }

function EssentialsPanel() { return <div className="essentials-v2">{guideData.essentials.groups.map((group)=><details key={group.id}><summary>{group.title}<ChevronDown/></summary>{group.items.map((item)=><p key={item}><Check/>{item}</p>)}</details>)}</div> }

type BackupData = { version:number; exportedAt:string; bookingStatuses:Record<string,string>;taskStatuses:Record<string,string>;actuals:Record<string,number>;notes:string;favorites:Record<string,boolean>;bookingEdits:Record<string,Partial<Booking>> };
function BackupPanel({ data,onImport,notes,setNotes }: { data:BackupData;onImport:(data:BackupData)=>void;notes:string;setNotes:(v:string)=>void }) { const inputRef=useRef<HTMLInputElement>(null);const exportData=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`europe-travel-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url)};const importData=async(file?:File)=>{if(!file)return;const parsed=JSON.parse(await file.text()) as BackupData;if(parsed.version!==1)throw new Error('不支持的备份版本');onImport(parsed)};return <div className="backup-v2"><article><Download/><h2>EXPORT TRAVEL DATA</h2><p>导出订单状态、任务、实际支出、备注、收藏与订单补充信息。换手机或清缓存前先备份。</p><button onClick={exportData}>导出JSON</button></article><article><Upload/><h2>IMPORT TRAVEL DATA</h2><p>导入会覆盖当前浏览器中的对应数据。</p><input ref={inputRef} type="file" accept="application/json" hidden onChange={(e)=>importData(e.target.files?.[0])}/><button onClick={()=>inputRef.current?.click()}>选择备份文件</button></article><label><span>TRIP NOTES</span><textarea value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="临时记录：酒店静音回复、航站楼、餐厅预约……"/></label></div> }

function MoreView({ tab,setTab,selectedDay,setSelectedDay,favorites,setFavorites,openImage,backupData,onImport,notes,setNotes }: { tab:MoreTab;setTab:(t:MoreTab)=>void;selectedDay:number;setSelectedDay:(d:number)=>void;favorites:Record<string,boolean>;setFavorites:(v:Record<string,boolean>)=>void;openImage:(image:LightboxImage)=>void;backupData:BackupData;onImport:(d:BackupData)=>void;notes:string;setNotes:(v:string)=>void }) { return <div className="v2-view"><Header eyebrow="MORE" title="住宿、地图与离线备份" note="酒店优先Single Room与睡眠证据；真实房型、价格和营业信息均显示核验状态。"/><div className="subnav"><button className={tab==='stay'?'active':''} onClick={()=>setTab('stay')}>STAY</button><button className={tab==='map'?'active':''} onClick={()=>setTab('map')}>MAP</button><button className={tab==='essentials'?'active':''} onClick={()=>setTab('essentials')}>ESSENTIALS</button><button className={tab==='backup'?'active':''} onClick={()=>setTab('backup')}>BACKUP</button></div>{tab==='stay'&&<StayPanel favorites={favorites} setFavorites={setFavorites} openImage={openImage}/>} {tab==='map'&&<MapPanel selectedDay={selectedDay} setSelectedDay={setSelectedDay}/>} {tab==='essentials'&&<EssentialsPanel/>} {tab==='backup'&&<BackupPanel data={backupData} onImport={onImport} notes={notes} setNotes={setNotes}/>}</div> }

export default function TravelGuideV2() {
  const [clock,setClock]=useState<Date | null>(null);
  const [view,setView]=useState<ViewId>('home');
  const [selectedDay,setSelectedDay]=useState(1);
  const [discoverTab,setDiscoverTab]=useState<DiscoverTab>('visual'); const [planTab,setPlanTab]=useState<PlanTab>('bookings'); const [moreTab,setMoreTab]=useState<MoreTab>('stay');
  const [lightbox,setLightbox]=useState<LightboxImage>(null);
  const [bookingStatuses,setBookingStatuses]=useLocalStorage<Record<string,string>>('europe-guide-booking-statuses',{});
  const [taskStatuses,setTaskStatuses]=useLocalStorage<Record<string,string>>('europe-guide-task-statuses',{});
  const [actuals,setActuals]=useLocalStorage<Record<string,number>>('europe-guide-budget-actuals',{});
  const [favorites,setFavorites]=useLocalStorage<Record<string,boolean>>('europe-guide-favorites',{});
  const [notes,setNotes]=useLocalStorage('europe-guide-notes','');
  const [bookingEdits,setBookingEdits]=useLocalStorage<Record<string,Partial<Booking>>>('europe-guide-booking-edits',{});
  useEffect(()=>{const frame=requestAnimationFrame(()=>{const current=new Date();setClock(current);const start=new Date(`${guideData.trip.startDate}T00:00:00`);const end=new Date(`${guideData.trip.endDate}T23:59:59`);setSelectedDay(tripDayToday(current));if(current>=start&&current<=end)setView('trip')});return()=>cancelAnimationFrame(frame)},[]);
  const actualTotal=useMemo(()=>Object.values(actuals).reduce((sum,value)=>sum+Number(value||0),0),[actuals]);
  const tasks=guideData.tasks.items as Task[];
  const nextTask=tasks.find((task)=>{const linked=task.linkedBookingId?bookingStatuses[task.linkedBookingId]:undefined;return !(linked&&task.autoCompleteWhen.includes(linked))&&(taskStatuses[task.id]??task.status)!=='Done'});
  const navigate=(next:ViewId)=>{setView(next);window.scrollTo({top:0,behavior:'smooth'})};
  const backupData:BackupData={version:1,exportedAt:new Date().toISOString(),bookingStatuses,taskStatuses,actuals,notes,favorites,bookingEdits};
  const importBackup=(data:BackupData)=>{setBookingStatuses(data.bookingStatuses??{});setTaskStatuses(data.taskStatuses??{});setActuals(data.actuals??{});setNotes(data.notes??'');setFavorites(data.favorites??{});setBookingEdits(data.bookingEdits??{})};
  return <div className="guide-v2">
    <aside className="side-nav"><button className="v2-brand" onClick={()=>navigate('home')}><b>EU</b><span>WINTER<br/>GUIDE</span></button><nav>{topNav.map(({id,label,icon:Icon})=><button key={id} className={view===id?'active':''} onClick={()=>navigate(id)}><Icon/><span>{label}</span></button>)}</nav><div className="side-meta"><i/><span>Data structure checked</span><b>Real-world facts dated</b></div></aside>
    <main className="v2-main"><header className="v2-topbar"><div><span>PERSONAL EUROPE / 2026</span><b>{topNav.find((item)=>item.id===view)?.label}</b></div><p>12.01 — 12.18 · 15 NIGHTS</p><span>LOCAL FIRST</span></header>
      {view==='home'&&<HomeView navigate={navigate} actualTotal={actualTotal} nextTask={nextTask} clock={clock}/>} {view==='trip'&&<TripView selectedDay={selectedDay} setSelectedDay={setSelectedDay} openImage={setLightbox} favorites={favorites} setFavorites={setFavorites} clock={clock}/>} {view==='discover'&&<DiscoverView tab={discoverTab} setTab={setDiscoverTab} openImage={setLightbox} favorites={favorites} setFavorites={setFavorites}/>} {view==='plan'&&<PlanView tab={planTab} setTab={setPlanTab} bookingStatuses={bookingStatuses} setBookingStatuses={setBookingStatuses} taskStatuses={taskStatuses} setTaskStatuses={setTaskStatuses} actuals={actuals} setActuals={setActuals} bookingEdits={bookingEdits} setBookingEdits={setBookingEdits}/>} {view==='more'&&<MoreView tab={moreTab} setTab={setMoreTab} selectedDay={selectedDay} setSelectedDay={setSelectedDay} favorites={favorites} setFavorites={setFavorites} openImage={setLightbox} backupData={backupData} onImport={importBackup} notes={notes} setNotes={setNotes}/>} 
    </main>
    <nav className="bottom-nav">{topNav.map(({id,label,icon:Icon})=><button key={id} className={view===id?'active':''} onClick={()=>navigate(id)}><Icon/><span>{label}</span></button>)}</nav>
    <Lightbox image={lightbox} onClose={()=>setLightbox(null)}/>
  </div>;
}
