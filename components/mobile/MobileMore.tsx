'use client';

import Image from 'next/image';
import { Check, Download, HeartPulse, Upload, WifiOff } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { AppController } from '@/features/app/useAppController';
import type { MoreTab } from '@/features/app/appModel';
import type { HotelBooking, SurvivalCity } from '@/lib/types';
import { guideData } from '@/lib/data';
import { realStays } from '@/features/trip/tripModel';
import { OfflinePackControl } from '@/components/offline-pack-control';
import { OfflineMapFallback } from '@/components/offline-map-fallback';
import { MobileHotelSheet } from '@/components/mobile/MobileHotelSheet';

type MorePanel = 'stays' | 'documents' | 'packing' | 'essentials' | 'survival' | 'offline' | 'backup';

const DocumentsPanel = lazy(async () => ({ default: (await import('@/components/documents/DocumentsPanel')).DocumentsPanel }));
const PackingPanel = lazy(async () => ({ default: (await import('@/components/packing/PackingPanel')).PackingPanel }));

const panels: Array<[MorePanel, string]> = [
  ['stays', 'Hotels'],
  ['documents', 'Documents'],
  ['packing', 'Packing'],
  ['essentials', 'Essentials'],
  ['survival', 'Survival'],
  ['offline', 'Offline'],
  ['backup', 'Backup'],
];

const mobilePanelForTab: Record<MoreTab, MorePanel> = {
  stay: 'stays',
  documents: 'documents',
  packing: 'packing',
  map: 'stays',
  survival: 'survival',
  essentials: 'essentials',
  backup: 'backup',
};

const moreTabForPanel: Partial<Record<MorePanel, MoreTab>> = {
  stays: 'stay',
  documents: 'documents',
  packing: 'packing',
  survival: 'survival',
  essentials: 'essentials',
  backup: 'backup',
};

export function MobileMore({ controller }: { controller: AppController }) {
  const [panel, setPanel] = useState<MorePanel>(() => mobilePanelForTab[controller.moreTab]);
  const [stay, setStay] = useState<HotelBooking | null>(null);
  useEffect(() => {
    const next = mobilePanelForTab[controller.moreTab];
    if (!next) return;
    const timer = window.setTimeout(() => setPanel(next), 0);
    return () => window.clearTimeout(timer);
  }, [controller.moreTab]);
  const fileRef = useRef<HTMLInputElement>(null);
  const exportBackup = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(controller.backup, null, 2)], {
        type: 'application/json',
      }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `europe-travel-os-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <main className="mobile-more" data-mobile-screen="more">
      <header className="mobile-screen-heading">
        <span>MORE</span>
        <h1>旅途工具箱</h1>
        <p>住宿、离线资料、生存信息和本地备份。</p>
      </header>
      <div className="mobile-filter-row">
        {panels.map(([id, label]) => (
          <button
            key={id}
            className={panel === id ? 'active' : ''}
            onClick={() => {
              setPanel(id);
              const urlTab = moreTabForPanel[id];
              if (urlTab) controller.selectMobileMoreTab(urlTab);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {panel === 'stays' && (
        <div className="mobile-stay-list">
          {realStays.map((item) => {
            const cover = item.images.find((image) => image.isCover)?.file ??
              item.images.find((image) => image.file)?.file;
            return (
              <button key={item.id} onClick={() => setStay(item)}>
                {cover && (
                  <Image
                    unoptimized
                    src={cover}
                    alt={item.hotelName}
                    width={104}
                    height={82}
                    loading="lazy"
                  />
                )}
                <span>
                  <small>{item.city} · {item.checkIn.slice(5)}–{item.checkOut.slice(5)}</small>
                  <b>{item.hotelName}</b>
                  <em><Check /> Confirmed · {item.execution.checkInTime}</em>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {panel === 'documents' && <Suspense fallback={<p className="readiness-loading">Opening local vault…</p>}><DocumentsPanel bookings={controller.bookings} /></Suspense>}
      {panel === 'packing' && <Suspense fallback={<p className="readiness-loading">Opening packing list…</p>}><PackingPanel items={controller.packingItems} setItems={controller.setPackingItems} /></Suspense>}

      {panel === 'essentials' && (
        <div className="mobile-accordion-list">
          {guideData.essentials.groups.map((group) => (
            <details key={group.id}>
              <summary>{group.title}</summary>
              {group.items.map((item) => <p key={item}><Check /> {item}</p>)}
            </details>
          ))}
        </div>
      )}

      {panel === 'survival' && (
        <div className="mobile-survival-list">
          {(guideData.survival as SurvivalCity[]).map((item) => (
            <details key={item.city}>
              <summary><HeartPulse /> {item.city}</summary>
              <p><b>Transit</b>{item.nearestTransit}</p>
              <p><b>Pharmacy</b>{item.pharmacy}</p>
              <p><b>Supermarket</b>{item.supermarket}</p>
              <p><b>Emergency</b>{item.emergency}</p>
              <p><b>Taxi</b>{item.taxi}</p>
            </details>
          ))}
        </div>
      )}

      {panel === 'offline' && (
        <section className="mobile-offline-panel">
          <WifiOff />
          <h2>Offline trip pack</h2>
          <p>下载当前核心行程、路线和精选媒体。地图瓦片不包含在离线包内。</p>
          <OfflinePackControl />
          <OfflineMapFallback
            selectedDay={controller.selectedDay}
            plan={controller.actions.plan}
            entities={controller.entities}
            resolve={controller.resolve}
          />
        </section>
      )}

      {panel === 'backup' && (
        <section className="mobile-backup-panel">
          <h2>Backup / Restore</h2>
          <p>包含 Current Plan、自定义项目、状态、收藏、Packing、预算实际支出和偏好交通。Documents 只保存在此设备。</p>
          <button onClick={exportBackup}><Download /> Export JSON</button>
          <button onClick={() => fileRef.current?.click()}><Upload /> Import JSON</button>
          <input
            ref={fileRef}
            hidden
            type="file"
            accept="application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                controller.importBackup(JSON.parse(await file.text()));
              } catch {
                window.alert('无法读取这个备份文件');
              }
            }}
          />
          <label>
            Travel notes
            <textarea value={controller.notes} onChange={(event) => controller.setNotes(event.target.value)} />
          </label>
        </section>
      )}
      <MobileHotelSheet stay={stay} close={() => setStay(null)} controller={controller} />
    </main>
  );
}
