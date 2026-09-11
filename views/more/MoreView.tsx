'use client';

import { Check, ChevronDown, Download, Upload } from 'lucide-react';
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
            openGallery={(gallery) => open(gallery)}
          />
        ))}
      </div>
    </div>
  );
}

export function MoreView({
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
      {tab === 'stay' && <Stay privateLinks={privateLinks} open={open} />}{' '}
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
