'use client';

import Image from 'next/image';
import { Camera, Check, Copy, Navigation } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import type { HotelBooking } from '@/lib/types';
import type { AppController } from '@/features/app/useAppController';
import { normalizeGalleryImage, openGalleryRequest } from '@/lib/media';
import { MobileSheet } from '@/components/mobile/MobileSheet';

const ContextualDocumentButton = lazy(async () => ({ default: (await import('@/components/documents/ContextualDocumentButton')).ContextualDocumentButton }));

export function MobileHotelSheet({
  stay,
  close,
  controller,
}: {
  stay: HotelBooking | null;
  close: () => void;
  controller: AppController;
}) {
  const [copied, setCopied] = useState(false);
  if (!stay) return null;
  const images = stay.images
    .filter((image) => image.file)
    .map((image) =>
      normalizeGalleryImage({ ...image, file: image.file! }, {
        entityId: stay.id,
        title: stay.hotelName,
      }),
    );
  const cover = images.find((image) => image.isCover) ?? images[0];
  const entrance = images.find((image) => image.role === 'entrance');
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.execution.address)}`;
  return (
    <MobileSheet
      open
      close={close}
      eyebrow={`STAY · ${stay.city}`}
      title={stay.hotelName}
      className="mobile-entity-sheet"
    >
      {cover && (
        <button
          className="mobile-detail-image"
          onClick={() =>
            controller.setLightbox(
              openGalleryRequest(stay.id, stay.hotelName, images, cover),
            )
          }
          aria-label={`打开 ${stay.hotelName} 图库`}
        >
          <Image
            unoptimized
            src={cover.file}
            alt={cover.title}
            fill
            sizes="100vw"
          />
          <span>
            <Camera /> {images.length} Photos
          </span>
        </button>
      )}
      <div className="mobile-detail-primary">
        <a href={maps} target="_blank" rel="noreferrer">
          <Navigation /> Navigate
        </a>
        <button
          onClick={async () => {
            await navigator.clipboard?.writeText(stay.execution.address);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          }}
        >
          {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy Address'}
        </button>
      </div>
      <p className="mobile-hotel-address">{stay.execution.address}</p>
      <Suspense fallback={null}><ContextualDocumentButton bookingId={`booking-${stay.id}`} /></Suspense>
      {entrance && (
        <button
          className="mobile-entrance-row"
          onClick={() =>
            controller.setLightbox(
              openGalleryRequest(stay.id, stay.hotelName, images, entrance),
            )
          }
        >
          <Image
            unoptimized
            src={entrance.file}
            alt={entrance.title}
            width={88}
            height={66}
          />
          <span>
            <b>Entrance photo</b>
            到达时快速确认入口
          </span>
        </button>
      )}
      <dl className="mobile-detail-facts">
        <div>
          <dt>入住</dt>
          <dd>{stay.execution.checkInTime}</dd>
        </div>
        <div>
          <dt>房型</dt>
          <dd>{stay.execution.roomType}</dd>
        </div>
        <div>
          <dt>付款</dt>
          <dd>{stay.execution.paymentStatus}</dd>
        </div>
        <div>
          <dt>在线入住</dt>
          <dd>{stay.execution.onlineCheckIn.status}</dd>
        </div>
      </dl>
    </MobileSheet>
  );
}
