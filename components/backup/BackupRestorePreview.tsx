'use client';

import { useEffect, useRef } from 'react';
import type { BackupPayload } from '@/features/app/appModel';
import { summarizeBackup } from '@/features/app/backupSummary';
import './backup.css';

export function BackupRestorePreview({ data, busy, onCancel, onConfirm, onExport }: {
  data: BackupPayload; busy: boolean; onCancel: () => void; onConfirm: () => void; onExport: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const summary = summarizeBackup(data);
  useEffect(() => { heading.current?.focus(); }, [data]);
  return <section className="backup-restore-preview" aria-label="恢复前预览" aria-busy={busy}>
    <h3 ref={heading} tabIndex={-1}>恢复前，核对这份备份</h3>
    <p className="backup-restore-meta">V{summary.version} · 导出于 {new Date(summary.exportedAt).toLocaleString('zh-CN', { hour12: false })}</p>
    <p>选择文件只会生成预览。确认后会覆盖本机浏览器中备份所含的数据；数量为 0 的项目也会被清空。</p>
    <dl>{summary.rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd className={row.mode === 'keep' ? 'is-kept' : ''}>{row.mode === 'keep' ? '备份未包含 · 保留本机' : `${row.count} 项 · 将覆盖`}</dd></div>)}</dl>
    <p>任务状态和旅行备注也会恢复。随身资料文件、私人入住链接不会改变。这里仅展示数量，不展示票据或个人资料内容。</p>
    <div className="backup-restore-actions">
      <button type="button" disabled={busy} onClick={onExport}>先导出当前备份</button>
      <button type="button" disabled={busy} onClick={onCancel}>取消恢复</button>
      <button type="button" className="backup-restore-confirm" disabled={busy} onClick={onConfirm}>{busy ? '正在恢复…' : '确认覆盖并恢复'}</button>
    </div>
  </section>;
}
