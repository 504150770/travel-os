'use client';

import { useState } from 'react';
import { parseBackup } from '@/features/app/backupModel';
import type { BackupPayload } from '@/features/app/appModel';
import { entityLibrary } from '@/lib/entity-library';

const knownEntityIds = new Set(entityLibrary.map((entity) => entity.id));

export function useBackupImport(importBackup: (data: BackupPayload) => void) {
  const [importError, setImportError] = useState('');
  const importFile = async (file: File) => {
    setImportError('');
    try {
      const data = parseBackup(await file.text(), knownEntityIds);
      if (!window.confirm('恢复这份18天行程备份？备份中包含的行程、状态、预算、收藏、备注和行李数据将覆盖当前数据。旧备份未包含的行李与交通偏好将保留本机值。随身资料文件和私人入住链接不受影响。请先保留当前导出备份。')) return;
      importBackup(data);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '无法读取这个备份文件，未覆盖当前数据。');
    }
  };
  return { importError, importFile };
}
