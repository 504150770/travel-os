'use client';

import { Check, ChevronDown, Download, Upload } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { guideData } from '@/lib/data';
import type { Day, SurvivalCity } from '@/lib/types';
import type { Entity } from '@/lib/entity-library';
import { useEditablePlan } from '@/hooks/use-editable-plan';
import { deriveCurrentDayState } from '@/lib/derive-current-day';
import { MiniRoute } from '@/components/mini-route';
import { HotelExecutionCard, SurvivalGrid } from '@/components/execution-cards';
import { OfflinePackControl } from '@/components/offline-pack-control';
import { OfflineMapFallback } from '@/components/offline-map-fallback';
import type { BackupPayload, LightboxImage, MoreTab } from '@/features/app/appModel';
import { yuan } from '@/features/app/appModel';
import { dayRoutes, hotelForNight, realStays, routeCityForDay } from '@/features/trip/tripModel';
import { useMoreController } from '@/features/more/useMoreController';
import type { AppController } from '@/features/app/useAppController';

const DocumentsPanel = lazy(async () => ({ default: (await import('@/components/documents/DocumentsPanel')).DocumentsPanel }));
const PackingPanel = lazy(async () => ({ default: (await import('@/components/packing/PackingPanel')).PackingPanel }));

function Stay({
  privateLinks = {},
  open,
}: {
  privateLinks?: Record<string, string>;
  open: (image: LightboxImage) => void;
}) {
  return (
    <div className="confirmed-stays">
      <header className="confirmed-stays-summary">
        <span>YOUR STAYS</span>
        <h2>六座城市，15晚住宿</h2>
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
            openGallery={(gallery) => open(gallery)}
          />
        ))}
      </div>
    </div>
  );
}

export function MoreView({
  controller,
  tab,
  setTab,
  selectedDay,
  setSelectedDay,
  backup,
  importBackup,
  notes,
  setNotes,
  actions,
  entities,
  resolve,
  privateLinks,
  open,
}: {
  controller: AppController;
  tab: MoreTab;
  setTab: (t: MoreTab) => void;
  selectedDay: number;
  setSelectedDay: (d: number) => void;
  backup: BackupPayload;
  importBackup: (v: BackupPayload) => void;
  notes: string;
  setNotes: (v: string) => void;
  actions: ReturnType<typeof useEditablePlan>;
  entities: Entity[];
  resolve: (id: string) => Entity | undefined;
  privateLinks: Record<string, string>;
  open: (image: LightboxImage) => void;
}) {
  const { fileRef, exportJson } = useMoreController(backup);
  return (
    <div className="v2-view content-view more-view">
      <header className="v2-heading">
        <span>MORE</span>
        <h1>旅途所需，随手可得。</h1>
        <p>查看住宿、整理随身资料，或备份你的行程。</p>
      </header>
      <div className="subnav">
        <button
          className={tab === 'stay' ? 'active' : ''}
          onClick={() => setTab('stay')}
        >
          住宿
        </button>
        <button className={tab === 'documents' ? 'active' : ''} onClick={() => setTab('documents')}>旅行资料</button>
        <button className={tab === 'packing' ? 'active' : ''} onClick={() => setTab('packing')}>行李清单</button>
        <button
          className={tab === 'map' ? 'active' : ''}
          onClick={() => setTab('map')}
        >
          路线
        </button>
        <button
          className={tab === 'survival' ? 'active' : ''}
          onClick={() => setTab('survival')}
        >
          实用信息
        </button>
        <button
          className={tab === 'essentials' ? 'active' : ''}
          onClick={() => setTab('essentials')}
        >
          出行须知
        </button>
        <button
          className={tab === 'backup' ? 'active' : ''}
          onClick={() => setTab('backup')}
        >
          备份
        </button>
      </div>
      {tab === 'stay' && <Stay privateLinks={privateLinks} open={open} />}{' '}
      {tab === 'documents' && <Suspense fallback={<p className="readiness-loading">Opening local vault…</p>}><DocumentsPanel bookings={controller.bookings} /></Suspense>}{' '}
      {tab === 'packing' && <Suspense fallback={<p className="readiness-loading">Opening packing list…</p>}><PackingPanel items={controller.packingItems} setItems={controller.setPackingItems} /></Suspense>}{' '}
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
          <OfflineMapFallback selectedDay={selectedDay} plan={actions.plan} entities={entities} resolve={resolve} />
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
          <OfflinePackControl />
          <article>
            <Download />
            <h2>导出行程备份</h2>
            <p>
              包含当前行程、备选、自定义项目、酒店、订单、任务、行李清单、预算、备注和收藏。随身资料文件仅保存在此设备，不包含在备份中。
            </p>
            <button onClick={exportJson}>导出JSON</button>
          </article>
          <article>
            <Upload />
            <h2>恢复行程备份</h2>
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
            <span>旅行备注</span>
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
