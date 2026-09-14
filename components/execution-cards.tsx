'use client';
import { safePrivateLink } from '@/lib/private-links';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';
import {
  BedDouble,
  BusFront,
  CarTaxiFront,
  Check,
  Clock3,
  ExternalLink,
  Footprints,
  MapPinned,
  Navigation,
  Plane,
  ShieldAlert,
} from 'lucide-react';
import type {
  Day,
  DayRoute,
  DayRouteLeg,
  DeadlineItem,
  HotelBooking,
  SurvivalCity,
  TransitDayExecution,
  TransportSegment,
} from '@/lib/types';
import { checkinActionId, deadlineActionId } from '@/lib/action-queue';
import {
  normalizeGalleryImage,
  openGalleryRequest,
  orderedGalleryImages,
  selectCoverImage,
  type GalleryRequest,
} from '@/lib/media';

const statusClass = (value: string) =>
  value === 'Ticketed' || value === 'Confirmed' || value === 'Not Required' || value === 'Ready'
    ? 'confirmed'
    : value === 'Requested' || value === 'Required'
      ? 'requested'
      : 'unknown';
const valueOrPending = (value: number | null, suffix: string) =>
  value == null ? '△ 出发前复核' : `${value}${suffix}`;
const displayValue = (value: string) =>
  value
    .replaceAll('UNVERIFIED', '△ 出发前确认')
    .replaceAll('Unknown', '△ 出发前确认')
    .replaceAll('PLANNING ESTIMATE', '△ 出发前复核');

export function RouteLegCard({ leg }: { leg: DayRouteLeg }) {
  const Icon =
    leg.recommendedMode === 'Walk'
      ? Footprints
      : leg.recommendedMode === 'Taxi'
        ? CarTaxiFront
        : BusFront;
  const primary =
    leg.recommendedMode === 'Walk'
      ? leg.walkMin == null
        ? '出发前复核'
        : `${leg.walkMin} min · ${leg.distanceKm} km`
      : leg.recommendedMode === 'Taxi'
        ? leg.taxiTime
        : leg.transitMin == null
          ? '公交线路出发前复核'
          : `约 ${leg.transitMin} min`;
  const backup =
    leg.recommendedMode === 'Walk'
      ? `Taxi backup · ${leg.taxiTime}`
      : `Walking backup · ${leg.walkMin == null ? '待复核' : `${leg.walkMin} min`} · Taxi backup · ${leg.taxiTime}`;
  return (
    <div className="route-leg-card">
      <div className="route-leg-icon">
        <Icon />
      </div>
      <div>
        <b>{leg.recommendedMode}</b>
        <strong>{primary}</strong>
        <small>{backup}</small>
      </div>
    </div>
  );
}

export function TodayAtGlance({ day, route }: { day: Day; route: DayRoute }) {
  const a = route.atGlance;
  return (
    <section className="today-glance">
      <header>
        <span>TODAY</span>
        <h2>今天一眼看懂</h2>
      </header>
      <div>
        <p>
          <b>出门</b>
          {a.mustLeaveHotel}
        </p>
        <p>
          <b>第一站</b>
          {a.firstStop}
        </p>
        <p>
          <b>步行</b>
          {valueOrPending(route.summary.walkingKm, ' km')} ·{' '}
          {valueOrPending(route.summary.walkingMin, ' min')}
        </p>
        <p>
          <b>必须预订</b>
          {a.mustBook}
        </p>
        <p>
          <b>Golden Hour</b>
          {a.goldenHour}
        </p>
        <p>
          <b>预计回酒店</b>
          {a.backHotel}
        </p>
        <p className="late">
          <b>来不及时</b>
          {a.lateRule}
        </p>
        <p>
          <b>明天</b>
          {a.tomorrow}
        </p>
      </div>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p>
      <b>{label}</b>
      {children}
    </p>
  );
}

export function TransitExecutionCard({
  execution,
  segment,
  preferred,
}: {
  execution: TransitDayExecution;
  segment: TransportSegment;
  preferred?: string;
}) {
  const selected =
    segment.candidates.find((candidate) => candidate.rank === preferred) ??
    segment.candidates[0];
  return (
    <section className="transit-execution">
      <header>
        <span>TRANSIT DAY EXECUTION CARD · DAY {execution.day}</span>
        <h2>{segment.route}</h2>
        <p>{segment.doorToDoor}</p>
      </header>
      <div className="transit-execution-grid">
        <article>
          <Clock3 />
          <h3>CHECK OUT</h3>
          <Fact label="Breakfast">{execution.checkout.breakfast}</Fact>
          <Fact label="Check-out">{execution.checkout.checkout}</Fact>
          <Fact label="Leave">{execution.checkout.leaveHotel}</Fact>
        </article>
        <article>
          <Navigation />
          <h3>HOTEL → HUB</h3>
          <Fact label="Mode">{execution.toHub.mode}</Fact>
          <Fact label="Time">{execution.toHub.duration}</Fact>
          <Fact label="28-inch">{execution.toHub.largeBag}</Fact>
          <Fact label="Latest">{execution.toHub.latestLeave}</Fact>
        </article>
        <article>
          <Plane />
          <h3>TRAIN / FLIGHT</h3>
          <Fact label="Operator">
            {selected.operator ?? execution.service.operator}
          </Fact>
          <Fact label="Service">
            {selected.service ?? execution.service.service}
          </Fact>
          <Fact label="Time">
            {selected.departure ?? execution.service.departure} →{' '}
            {selected.arrival ?? execution.service.arrival}
          </Fact>
          <Fact label="Buffer">{execution.service.buffer}</Fact>
          <Fact label="Baggage">{execution.service.baggage}</Fact>
          <span
            className={`execution-status ${statusClass(execution.service.status)}`}
          >
            {execution.service.status}
          </span>
        </article>
        <article>
          <MapPinned />
          <h3>ARRIVAL</h3>
          <Fact label="Route">
            {execution.arrival.from} → {execution.arrival.to}
          </Fact>
          <Fact label="Mode">{execution.arrival.mode}</Fact>
          <Fact label="Time">{execution.arrival.duration}</Fact>
          <Fact label="Changes">{execution.arrival.changes}</Fact>
          <Fact label="28-inch">{execution.arrival.largeBag}</Fact>
        </article>
        <article>
          <BedDouble />
          <h3>LUGGAGE</h3>
          <Fact label="Early storage">{execution.luggage.early}</Fact>
          <Fact label="Fallback">{execution.luggage.fallback}</Fact>
        </article>
        <article>
          <ShieldAlert />
          <h3>AFTER ARRIVAL</h3>
          <Fact label="Can still do">{execution.afterArrival}</Fact>
          <Fact label="+30 min">{execution.delay30}</Fact>
          <Fact label="+60 min">{execution.delay60}</Fact>
          <Fact label="+90 min">{execution.delay90}</Fact>
        </article>
      </div>
    </section>
  );
}

function State({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <b>{label}</b>
      <span title={value} className={`execution-status ${statusClass(value)}`}>
        {displayValue(value)}
      </span>
    </p>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard?.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
    >
      {copied ? 'Copied ✓' : 'Copy Address'}
    </button>
  );
}

export function HotelExecutionCard({
  stay,
  privateCheckInLink,
  openGallery,
}: {
  stay: HotelBooking;
  privateCheckInLink?: string;
  openGallery: (gallery: GalleryRequest) => void;
}) {
  const verifiedImages = orderedGalleryImages(stay.images
    .filter((image): image is typeof image & { file: string } => Boolean(image.file))
    .map((image) => normalizeGalleryImage({
      ...image,
      file: image.file,
      title: image.title || image.caption || `${stay.hotelName} ${image.role}`,
      role: image.role,
      isCover: image.isCover,
      priority: image.priority,
    }, { entityId: stay.id, title: stay.hotelName, source: image.source || undefined, lastVerified: image.lastVerified })));
  const cover = selectCoverImage(verifiedImages);
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.execution.address)}`;
  const atProperty = stay.execution.payAtProperty
    ? `${stay.execution.payAtProperty.amount} ${stay.execution.payAtProperty.currency}`
    : '凭证未列';
  const cityTax =
    stay.execution.payAtProperty?.label === '城市税'
      ? atProperty
      : '凭证未单列';
  const otherFees =
    stay.execution.payAtProperty &&
    stay.execution.payAtProperty.label !== '城市税'
      ? `${atProperty} · ${stay.execution.payAtProperty.label}`
      : '凭证未列';
  return (
    <article className="hotel-execution-card">
      <header>
        <span>
          {stay.city} · {stay.nights} NIGHTS
        </span>
        <h2>{stay.hotelName}</h2>
        <b>
          {stay.checkIn} → {stay.checkOut}
        </b>
      </header>
      {cover ? (
        <button
          className="hotel-media-carousel hotel-gallery-cover"
          onClick={() => openGallery(openGalleryRequest(stay.id, stay.hotelName, verifiedImages, cover))}
          aria-label={`Open ${stay.hotelName} gallery, ${verifiedImages.length} photos`}
        >
          <figure>
            <Image
              unoptimized
              src={cover.file}
              alt={cover.title}
              fill
              sizes="(max-width:680px) 100vw, 720px"
            />
            <figcaption>
              <b>{cover.role}</b>
              <span>{cover.caption}</span>
              <small>{verifiedImages.length} Photos</small>
            </figcaption>
          </figure>
        </button>
      ) : (
        <div className="hotel-media-fallback">No verified property photo</div>
      )}
      <div className="hotel-summary-chips" aria-label="住宿关键信息">
        <span>{displayValue(stay.execution.frontDeskType)}</span>
        <span>入住 {stay.execution.checkInTime}</span>
        <span>寄存 {displayValue(stay.execution.luggage.early)}</span>
        <span>{stay.execution.paymentStatus}</span>
      </div>
      <details className="hotel-detail-toggle">
        <summary>View Stay</summary>
        <div className="hotel-execution-grid">
          <section>
            <h3>CHECK-IN</h3>
            <Fact label="In / Out">
              {stay.execution.checkInTime} / {stay.execution.checkOutTime}
            </Fact>
            <Fact label="Front desk">
              {displayValue(stay.execution.frontDeskType)}
            </Fact>
            <Fact label="Online">
              {displayValue(stay.execution.onlineCheckIn.requirement)} ·{' '}
              {displayValue(stay.execution.onlineCheckIn.status)}
            </Fact>
            <Fact label="Deadline">
              {displayValue(stay.execution.onlineCheckIn.deadline)}
            </Fact>
            <small>{stay.execution.onlineCheckIn.note}</small>
          </section>
          <section>
            <h3>LUGGAGE</h3>
            <State label="Early" value={stay.execution.luggage.early} />
            <State
              label="After checkout"
              value={stay.execution.luggage.afterCheckout}
            />
            <Fact label="Location">
              {displayValue(stay.execution.luggage.location)}
            </Fact>
            <Fact label="Fee">{displayValue(stay.execution.luggage.fee)}</Fact>
            <small>{displayValue(stay.execution.luggage.note)}</small>
          </section>
          <section>
            <h3>ROOM</h3>
            <Fact label="Type">{stay.execution.roomType}</Fact>
            <Fact label="Bed">{stay.execution.bed}</Fact>
            <Fact label="Bathroom">
              {stay.execution.privateBathroom ? 'Confirmed private' : 'Unknown'}
            </Fact>
            <Fact label="Breakfast">
              {displayValue(stay.execution.breakfastDetails)} ·{' '}
              {displayValue(stay.execution.breakfastTime)}
            </Fact>
            <Fact label="Heating">{displayValue(stay.execution.heating)}</Fact>
          </section>
          <section>
            <h3>PAYMENT</h3>
            <Fact label="Paid">¥{stay.execution.paidOnlineCny.toFixed(2)}</Fact>
            <Fact label="At property">{atProperty}</Fact>
            <Fact label="City tax">{cityTax}</Fact>
            <Fact label="Other mandatory">{otherFees}</Fact>
            <Fact label="Committed">
              ¥{stay.execution.committedCnyApprox.toFixed(2)}
            </Fact>
          </section>
          <section>
            <h3>REQUEST</h3>
            <State
              label="Quiet room"
              value={stay.execution.requests.quietRoom}
            />
            <State
              label="Non-smoking"
              value={stay.execution.requests.nonSmoking}
            />
            <State
              label="Away from elevator"
              value={stay.execution.requests.awayFromElevator}
            />
            <State
              label="Away from street"
              value={stay.execution.requests.awayFromStreet}
            />
            <State
              label="Away from service"
              value={stay.execution.requests.awayFromServiceArea}
            />
            <small>Requested 项均 subject to availability。</small>
          </section>
          <section>
            <h3>CANCELLATION</h3>
            <Fact label="Free until">
              {stay.execution.cancellation.freeUntil.replace('T', ' ')}
            </Fact>
            <Fact label="After deadline">
              {stay.execution.cancellation.afterDeadline}
            </Fact>
            <h3>CONTACT</h3>
            <Fact label="Phone">{stay.execution.phone}</Fact>
            <Fact label="Address">{stay.execution.address}</Fact>
            <div className="hotel-card-actions">
              <a href={maps} target="_blank" rel="noreferrer">
                Google Maps <ExternalLink />
              </a>
              <CopyButton value={stay.execution.address} />
              {privateCheckInLink && (
                <a
                  href={safePrivateLink(privateCheckInLink)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Private check-in <ExternalLink />
                </a>
              )}
            </div>
          </section>
        </div>
      </details>
    </article>
  );
}

export function CheckinCenter({
  stays,
  statuses,
  setStatuses,
  privateLinks,
  setPrivateLinks,
}: {
  stays: HotelBooking[];
  statuses: Record<string, string>;
  setStatuses: (value: Record<string, string>) => void;
  privateLinks: Record<string, string>;
  setPrivateLinks: (value: Record<string, string>) => void;
}) {
  const ordered = [...stays].sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  return (
    <div className="checkin-center">
      <header>
        <span>CHECK-IN CENTER</span>
        <h1>在线入住集中处理</h1>
        <p>只把真正影响进门的动作标为 Required。</p>
      </header>
      {ordered.map((stay) => {
        const actionId = checkinActionId(stay.id);
        const checked =
          (statuses[actionId] ??
            (stay.execution.onlineCheckIn.completionDefault
              ? 'Done'
              : stay.execution.onlineCheckIn.status)) === 'Done';
        const privateLink = privateLinks[stay.id] ?? '';
        const validLink =
          safePrivateLink(privateLink) ??
          safePrivateLink(stay.execution.onlineCheckIn.link ?? undefined);
        return (
          <article
            key={stay.id}
            className={
              stay.execution.onlineCheckIn.requirement === 'Required'
                ? 'critical'
                : ''
            }
          >
            <button
              className={checked ? 'done' : ''}
              onClick={() =>
                setStatuses({
                  ...statuses,
                  [actionId]: checked ? 'Waiting' : 'Done',
                })
              }
            >
              <Check />
            </button>
            <div>
              <span>
                {stay.checkIn} · {stay.city}
              </span>
              <h2>{stay.hotelName}</h2>
              <p>{stay.execution.onlineCheckIn.note}</p>
              <small>
                Deadline · {displayValue(stay.execution.onlineCheckIn.deadline)}
              </small>
            </div>
            <b
              className={`execution-status ${statusClass(stay.execution.onlineCheckIn.requirement)}`}
            >
              {stay.execution.onlineCheckIn.requirement}
            </b>
            {validLink ? (
              <a href={validLink} target="_blank" rel="noreferrer">
                Open link
              </a>
            ) : (
              <span className="email-action">Open original email</span>
            )}
            <label className="private-checkin-link">
              <span>PRIVATE LINK · 仅保存在本机</span>
              <input
                type="url"
                value={privateLink}
                placeholder="粘贴邮件中的私人入住链接"
                onChange={(event) =>
                  setPrivateLinks({
                    ...privateLinks,
                    [stay.id]: event.target.value,
                  })
                }
              />
            </label>
          </article>
        );
      })}
    </div>
  );
}

export function DeadlineCenter({
  items,
  statuses,
  setStatuses,
}: {
  items: DeadlineItem[];
  statuses: Record<string, string>;
  setStatuses: (value: Record<string, string>) => void;
}) {
  const groups = [
    { key: 'Critical', title: 'CRITICAL TO CONFIRM' },
    { key: 'Nice', title: 'NICE TO CONFIRM' },
  ] as const;
  return (
    <div className="deadline-center">
      <header>
        <span>DEADLINE CENTER</span>
        <h1>关键日期集中处理</h1>
      </header>
      {groups.map((group) => (
        <section key={group.key}>
          <h2>{group.title}</h2>
          {items
            .filter((item) => item.priority === group.key)
            .map((item) => {
              const actionId = deadlineActionId(item);
              const unifiedStatus = statuses[actionId] ?? item.status;
              return (
                <article key={item.id}>
                  <time>
                    {item.date}
                    <small>{item.time}</small>
                  </time>
                  <div>
                    <span>{item.category}</span>
                    <h3>{item.title}</h3>
                    <p>{item.action}</p>
                  </div>
                  <select
                    value={unifiedStatus}
                    onChange={(event) =>
                      setStatuses({
                        ...statuses,
                        [actionId]: event.target.value,
                      })
                    }
                  >
                    <option>Open</option>
                    <option>Ready</option>
                    <option>Waiting</option>
                    <option>Required</option>
                    <option>Done</option>
                  </select>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noreferrer">
                      Go to <ExternalLink />
                    </a>
                  )}
                </article>
              );
            })}
        </section>
      ))}
    </div>
  );
}

export function SurvivalGrid({
  items,
  stays,
}: {
  items: SurvivalCity[];
  stays: HotelBooking[];
}) {
  return (
    <div className="survival-grid">
      {items.map((item) => {
        const stay = stays.find((hotel) => hotel.id === item.hotelId);
        const search = (query: string) =>
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query} near ${stay?.execution.address ?? item.city}`)}`;
        return (
          <article key={item.city}>
            <header>
              <span>{item.city}</span>
              <h2>Emergency / Survival</h2>
            </header>
            <Fact label="Hotel">{stay?.hotelName}</Fact>
            <Fact label="Transit">{item.nearestTransit}</Fact>
            <a href={search('supermarket')} target="_blank" rel="noreferrer">
              Nearest supermarket
            </a>
            <a href={search('pharmacy')} target="_blank" rel="noreferrer">
              Nearest pharmacy
            </a>
            <a
              href={search('convenience food')}
              target="_blank"
              rel="noreferrer"
            >
              Convenience food
            </a>
            <Fact label="Station">{item.mainStation}</Fact>
            <Fact label="Airport">{item.airport}</Fact>
            <Fact label="Emergency">{item.emergency}</Fact>
            <Fact label="Taxi">{item.taxi}</Fact>
            <Fact label="Hotel phone">{item.hotelPhone}</Fact>
          </article>
        );
      })}
    </div>
  );
}
