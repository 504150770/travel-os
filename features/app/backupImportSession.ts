import type { BackupPayload } from './appModel';

export type BackupImportState = {
  phase: 'idle' | 'reading' | 'review' | 'restoring' | 'done';
  data: BackupPayload | null;
  error: string;
};
export const initialBackupImportState: BackupImportState = { phase: 'idle', data: null, error: '' };

// Selection only parses. Confirmation consumes exactly the reviewed snapshot.
// New selections and cancellation invalidate older asynchronous reads.
export function createBackupImportSession(parse: (text: string) => BackupPayload, changed: (state: BackupImportState) => void) {
  let state = initialBackupImportState;
  let sequence = 0;
  const update = (next: BackupImportState) => { state = next; changed(next); };
  return {
    async select(file: { text: () => Promise<string> }) {
      if (state.phase === 'restoring') return;
      const request = ++sequence;
      update({ phase: 'reading', data: null, error: '' });
      try {
        const data = parse(await file.text());
        if (request === sequence) update({ phase: 'review', data, error: '' });
      } catch (error) {
        if (request === sequence) update({ phase: 'idle', data: null, error: error instanceof Error ? error.message : '无法读取这个备份文件，未覆盖当前数据。' });
      }
    },
    cancel() {
      if (state.phase === 'restoring') return;
      ++sequence;
      update(initialBackupImportState);
    },
    confirm(restore: (data: BackupPayload) => void) {
      if (state.phase !== 'review' || !state.data) return;
      const data = state.data;
      update({ phase: 'restoring', data, error: '' });
      try {
        restore(data);
        update({ phase: 'done', data: null, error: '' });
      } catch (error) {
        update({ phase: 'review', data, error: error instanceof Error ? error.message : '恢复失败，请保留原备份后重试。' });
      }
    },
  };
}
