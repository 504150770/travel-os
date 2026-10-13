'use client';

import { Check, ChevronDown, ExternalLink, Plane, TrainFront } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import type { AppController } from '@/features/app/useAppController';
import { yuan } from '@/features/app/appModel';
import { transportSegments } from '@/features/trip/tripModel';
import { guideData } from '@/lib/data';
import type { TransportCandidate, TransportSegment } from '@/lib/types';
import { mobileTransportBookingIds, transportPreferenceAllowed, transportSegmentsForDay } from '@/components/mobile/mobileTransportModel';

const ContextualDocumentButton = lazy(async () => ({ default: (await import('@/components/documents/ContextualDocumentButton')).ContextualDocumentButton }));

const rankLabels: Record<string, string> = {
  TICKETED: '已出票行程',
  'BEST OVERALL': '综合推荐',
  'BEST VALUE': '价格优先',
  'BEST COMFORT': '舒适优先',
};

export function MobileTransportPanel({ controller }: { controller: AppController }) {
  const date = guideData.days[controller.selectedDay - 1]?.date ?? '';
  const groups = transportSegmentsForDay(transportSegments, controller.selectedDay, date);
  return (
    <div className="mobile-transport-panel">
      <p className="mobile-transport-context">
        Day {controller.selectedDay} · {date}
        {groups.current.length === 0 && ' · 当天没有跨城出发或已出票抵达航段'}
      </p>
      {groups.current.map((segment) => (
        <TransportCard key={`${controller.selectedDay}-${segment.id}`} segment={segment} controller={controller} initiallyOpen />
      ))}
      {groups.other.length > 0 && <h2 className="mobile-transport-group-title">{groups.current.length ? '其他日期' : '全部跨城交通'}</h2>}
      {groups.other.map((segment) => (
        <TransportCard key={`${controller.selectedDay}-${segment.id}`} segment={segment} controller={controller} />
      ))}
    </div>
  );
}

function TransportCard({ segment, controller, initiallyOpen = false }: {
  segment: TransportSegment;
  controller: AppController;
  initiallyOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(initiallyOpen);
  const preferred = controller.preferredTransport[segment.id];
  const bookingId = mobileTransportBookingIds[segment.id];
  const Icon = segment.mode === 'train' ? TrainFront : Plane;
  return (
    <article className="mobile-transport-card">
      <button className="mobile-transport-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        <Icon />
        <span>
          <small>DAY {segment.day} · {segment.date}</small>
          <strong>{segment.route}</strong>
          <span>{segment.status === 'TICKETED' ? '已出票' : preferred ? `偏好：${rankLabels[preferred] ?? preferred}` : '待确认班次与票价'}</span>
        </span>
        <ChevronDown />
      </button>
      {expanded && <div className="mobile-transport-content">
        <p className="mobile-transport-door">{segment.doorToDoor}</p>
        <p>{segment.recommendation}</p>
        {bookingId && <Suspense fallback={null}>
          <ContextualDocumentButton bookingId={bookingId} onAdd={controller.openDocumentForBooking} />
        </Suspense>}
        <div className="mobile-transport-candidates">
          {segment.candidates.map((candidate) => (
            <CandidateCard
              key={candidate.rank}
              candidate={candidate}
              preferred={preferred === candidate.rank}
              canSelect={transportPreferenceAllowed(segment.status, candidate.status)}
              select={() => {
                if (!transportPreferenceAllowed(segment.status, candidate.status)) return;
                controller.setPreferredTransport({ ...controller.preferredTransport, [segment.id]: candidate.rank });
              }}
            />
          ))}
        </div>
        {segment.airportComparison && <details className="mobile-transport-extra">
          <summary>机场接驳比较 <ChevronDown /></summary>
          {segment.airportComparison.map((airport) => <p key={airport.airport}><b>{airport.airport}</b> · {airport.ground}<br />{airport.decision}</p>)}
        </details>}
        {segment.expectedReleaseWindow && <p>复查窗口：{segment.expectedReleaseWindow}</p>}
        <footer className="mobile-transport-source">
          <p>{segment.status === 'TICKETED' ? '行李及退改规则以票面为准。' : '班次、票价和行李按出票页最终确认。'}核对日期 {segment.checkedAt}</p>
          <div>
            {/^https?:\/\//i.test(segment.source) ? <a href={segment.source} target="_blank" rel="noreferrer">目标日查询 <ExternalLink /></a> : <span>{segment.source}</span>}
            {segment.routeSource && /^https?:\/\//i.test(segment.routeSource) && <a href={segment.routeSource} target="_blank" rel="noreferrer">官方线路 <ExternalLink /></a>}
          </div>
        </footer>
      </div>}
    </article>
  );
}

function CandidateCard({ candidate, preferred, canSelect, select }: {
  candidate: TransportCandidate;
  preferred: boolean;
  canSelect: boolean;
  select: () => void;
}) {
  const ticketed = candidate.status === 'TICKETED';
  return (
    <section className={`mobile-transport-candidate${preferred ? ' is-preferred' : ''}`}>
      <header>
        <b>{rankLabels[candidate.rank] ?? candidate.rank}</b>
        {preferred && <span><Check /> 当前偏好</span>}
      </header>
      <h3>{candidate.operator ?? '运营方待确认'}</h3>
      <p>{candidate.service ?? '班次待确认'}</p>
      <dl className="mobile-plan-facts">
        <div><dt>出发</dt><dd>{candidate.departure ?? '具体时间待确认'}</dd></div>
        <div><dt>抵达</dt><dd>{candidate.arrival ?? '具体时间待确认'}{candidate.arrival && <small>{candidate.arrivalDate}</small>}</dd></div>
        <div><dt>用时 / 换乘</dt><dd>{candidate.duration} · {candidate.changes} 次换乘</dd></div>
        <div><dt>票价</dt><dd>{candidate.priceCny == null ? ticketed ? '实付金额未记录' : '目标日价格待确认' : `${yuan(candidate.priceCny)} 基础含税`}</dd></div>
        <div><dt>23kg 行李</dt><dd>{candidate.baggage23kg == null ? '待确认' : candidate.baggage23kg ? '已含 / 铁路可带' : '未含'} · {candidate.carryOn}</dd></div>
      </dl>
      <p className="mobile-transport-verification">{ticketed ? '已出票' : '候选方案 · 出票前确认'} · 核对 {candidate.checkedAt}{!ticketed && <span>{candidate.status}</span>}</p>
      <details className="mobile-transport-extra">
        <summary>班次与退改规则 <ChevronDown /></summary>
        <dl className="mobile-plan-facts">
          <div><dt>班次号</dt><dd>{candidate.flightNo ?? '待确认'}</dd></div>
          <div><dt>票价档</dt><dd>{candidate.fareType}</dd></div>
          <div><dt>中转</dt><dd>{candidate.transit ?? (candidate.changes === 0 ? '直达' : '待确认')} · {candidate.selfTransfer ? '自助转机' : '非自助转机'}</dd></div>
          <div><dt>航站楼</dt><dd>{candidate.terminalChange ?? '不适用'}</dd></div>
          <div><dt>退改</dt><dd>{candidate.refundability} · 改签费 {candidate.changeFee}</dd></div>
          <div><dt>核验状态</dt><dd>{candidate.status}</dd></div>
        </dl>
      </details>
      {canSelect && <button className="mobile-transport-prefer" aria-pressed={preferred} onClick={select}>
        {preferred ? <><Check /> 已设为偏好</> : '设为偏好'}
      </button>}
    </section>
  );
}
