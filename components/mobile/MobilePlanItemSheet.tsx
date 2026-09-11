'use client';

import { ArrowDown, ArrowUp, Navigation, RefreshCcw, Trash2 } from 'lucide-react';
import type { Entity } from '@/lib/entity-library';
import type { PlanItem } from '@/hooks/use-editable-plan';
import type { AppController } from '@/features/app/useAppController';
import { mapLinks } from '@/features/trip/tripModel';
import { MobileSheet } from '@/components/mobile/MobileSheet';

export function MobilePlanItemSheet({
  item,
  entity,
  index,
  total,
  close,
  controller,
}: {
  item: PlanItem | null;
  entity: Entity | null;
  index: number;
  total: number;
  close: () => void;
  controller: AppController;
}) {
  if (!item || !entity) return null;
  const links = mapLinks(entity);
  const run = (action: () => void) => {
    action();
    close();
  };
  return (
    <MobileSheet open close={close} eyebrow="CURRENT PLAN" title={entity.name}>
      <div className="mobile-sheet-actions">
        <a href={links.google} target="_blank" rel="noreferrer">
          <Navigation /> Navigate
        </a>
        <button
          disabled={index === 0}
          onClick={() =>
            run(() => controller.actions.moveWithin(controller.selectedDay, item.id, -1))
          }
        >
          <ArrowUp /> Move earlier
        </button>
        <button
          disabled={index === total - 1}
          onClick={() =>
            run(() => controller.actions.moveWithin(controller.selectedDay, item.id, 1))
          }
        >
          <ArrowDown /> Move later
        </button>
        <button
          onClick={() =>
            run(() =>
              controller.actions.transfer(
                controller.selectedDay,
                item.id,
                'activeItems',
                'alternatives',
              ),
            )
          }
        >
          <RefreshCcw /> Replace / move to alternatives
        </button>
        <button
          className="danger"
          onClick={() =>
            run(() =>
              controller.actions.transfer(
                controller.selectedDay,
                item.id,
                'activeItems',
                'removedItems',
              ),
            )
          }
        >
          <Trash2 /> Remove
        </button>
      </div>
    </MobileSheet>
  );
}
