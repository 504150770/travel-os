'use client';

import { useState } from 'react';
import { parseBackup } from '@/features/app/backupModel';
import { createBackupImportSession, initialBackupImportState } from '@/features/app/backupImportSession';
import type { BackupPayload } from '@/features/app/appModel';
import { entityLibrary } from '@/lib/entity-library';

const knownEntityIds = new Set(entityLibrary.map((entity) => entity.id));

export function useBackupImport(importBackup: (data: BackupPayload) => void) {
  const [state, setState] = useState(initialBackupImportState);
  const [session] = useState(() => createBackupImportSession((text) => parseBackup(text, knownEntityIds), setState));
  return {
    importError: state.error,
    pendingBackup: state.data,
    isReading: state.phase === 'reading',
    isRestoring: state.phase === 'restoring',
    importFile: (file: File) => session.select(file),
    cancelImport: () => session.cancel(),
    confirmImport: () => session.confirm(importBackup),
  };
}
