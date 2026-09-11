'use client';

import Image from 'next/image';
import { Camera, Navigation, Plus } from 'lucide-react';
import type { Entity } from '@/lib/entity-library';
import type { AppController } from '@/features/app/useAppController';
import { mapLinks } from '@/features/trip/tripModel';
import { openGalleryRequest, selectCoverImage } from '@/lib/media';
import { MobileSheet } from '@/components/mobile/MobileSheet';

export function MobileEntitySheet({
  entity,
  close,
  controller,
}: {
  entity: Entity | null;
  close: () => void;
  controller: AppController;
}) {
  if (!entity) return null;
  const cover = selectCoverImage(entity.images);
  const links = mapLinks(entity);
  const placement = controller.actions.placement(entity.id, controller.selectedDay);
  const dishes =
    typeof entity.raw.dishes === 'string'
      ? entity.raw.dishes
          .split(/[、，,；;]/)
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  return (
    <MobileSheet
      open
      close={close}
      eyebrow={`${entity.type.toUpperCase()} · ${entity.city}`}
      title={entity.name}
      className="mobile-entity-sheet"
    >
      {cover && (
        <button
          className="mobile-detail-image"
          onClick={() =>
            controller.setLightbox(
              openGalleryRequest(entity.id, entity.name, entity.images, cover),
            )
          }
          aria-label={`打开 ${entity.name} 图库`}
        >
          <Image
            unoptimized
            src={cover.file}
            alt={cover.title || entity.name}
            fill
            sizes="100vw"
          />
          <span>
            <Camera /> {entity.images.length} Photos
          </span>
        </button>
      )}
      <div className="mobile-detail-primary">
        <a href={links.google} target="_blank" rel="noreferrer">
          <Navigation /> Navigate
        </a>
        {!placement && (
          <button
            onClick={() =>
              controller.actions.addEntity(
                entity.id,
                controller.selectedDay,
                'activeItems',
              )
            }
          >
            <Plus /> Add to Today
          </button>
        )}
        {placement && <span>Day {placement.dayId} 已加入 ✓</span>}
      </div>
      <p className="mobile-detail-copy">
        {entity.description || entity.notes || '现场信息以官方页面为准。'}
      </p>
      {dishes.length > 0 && (
        <section className="mobile-order-section">
          <span>WHAT TO ORDER</span>
          <div>
            {dishes.map((dish) => {
              const image = entity.images.find((item) =>
                item.matchesDishes?.includes(dish),
              );
              return (
                <button
                  key={dish}
                  disabled={!image}
                  onClick={() =>
                    image &&
                    controller.setLightbox(
                      openGalleryRequest(
                        entity.id,
                        entity.name,
                        entity.images,
                        image,
                      ),
                    )
                  }
                >
                  {image && (
                    <Image
                      unoptimized
                      src={image.file}
                      alt={image.title || dish}
                      width={96}
                      height={72}
                    />
                  )}
                  <span>{dish}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
      <dl className="mobile-detail-facts">
        <div>
          <dt>价格 / 票务</dt>
          <dd>{entity.priceLabel}</dd>
        </div>
        <div>
          <dt>营业时间</dt>
          <dd>{entity.openingHours}</dd>
        </div>
        <div>
          <dt>地址</dt>
          <dd>{entity.address}</dd>
        </div>
        <div>
          <dt>最近核对</dt>
          <dd>{entity.lastVerified}</dd>
        </div>
      </dl>
    </MobileSheet>
  );
}
