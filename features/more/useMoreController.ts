'use client';

import { useRef } from 'react';
import type { BackupPayload } from '@/features/app/appModel';

export function useMoreController(backup: BackupPayload) {
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `europe-travel-os-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return { fileRef, exportJson };
}
