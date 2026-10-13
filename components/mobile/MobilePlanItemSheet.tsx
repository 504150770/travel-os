'use client';

import {
  ArrowDown,
  ArrowUp,
  Navigation,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
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
    <MobileSheet
      open
      close={close}
      eyebrow={`D${controller.selectedDay} · 当天安排`}
      title={entity.name}
    >
      <div className="mobile-sheet-actions">
        <a href={links.google} target="_blank" rel="noreferrer">
          <Navigation /> 导航
        </a>
        <button
          disabled={index === 0}
          onClick={() =>
            run(() =>
              controller.actions.moveWithin(
                controller.selectedDay,
                item.id,
                -1,
              ),
            )
          }
        >
          <ArrowUp /> 提前一项
        </button>
        <button
          disabled={index === total - 1}
          onClick={() =>
            run(() =>
              controller.actions.moveWithin(controller.selectedDay, item.id, 1),
            )
          }
        >
          <ArrowDown /> 推后一项
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
          <RefreshCcw /> 移至当天备选
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
          <Trash2 /> 移除安排
        </button>
      </div>
    </MobileSheet>
  );
}
