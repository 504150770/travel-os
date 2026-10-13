'use client';

import Image from 'next/image';
import { Check, ChevronDown, Download, HardDrive, Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type SaveState = 'saving' | 'saved' | null;

export function PersonalMenu({
  online,
  openBackup,
  openSettings,
}: {
  online: boolean;
  openBackup: () => void;
  openSettings: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !rootRef.current?.contains(event.target as Node)) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    window.addEventListener('mousedown', closeOnOutsideClick);
    window.addEventListener('focusin', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('mousedown', closeOnOutsideClick);
      window.removeEventListener('focusin', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    const updateSaveState = (event: Event) => {
      const next = (event as CustomEvent<'saving' | 'saved'>).detail;
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
      setSaveState(next);
      if (next === 'saved') {
        hideTimer.current = window.setTimeout(() => setSaveState(null), 1400);
      }
    };
    window.addEventListener('travel-save-state', updateSaveState);
    return () => {
      window.removeEventListener('travel-save-state', updateSaveState);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
  }, []);

  const openAndClose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return <div ref={rootRef} className="personal-entry">
    <span className={`nav-save-state ${saveState ? 'visible' : ''}`} aria-live="polite">
      {saveState === 'saving' ? '保存中…' : saveState === 'saved' ? <><Check /> 已保存</> : ''}
    </span>
    <button
      ref={triggerRef}
      className="personal-trigger"
      type="button"
      aria-label="Jacob"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={() => setOpen((value) => !value)}
    >
      <Image src="/images/jacob-personal-mark.webp" alt="" width={36} height={36} priority />
      <span>Jacob</span>
      <ChevronDown className={open ? 'open' : ''} />
    </button>
    {open && <div className="personal-menu" role="menu">
      <div className="personal-menu-status">
        <HardDrive />
        <span><b>本机行程</b><small>{online ? '当前在线，行程保存在此设备' : '当前离线，请使用已保存的内容'}</small></span>
        <i className={online ? 'online' : 'offline'} />
      </div>
      <button type="button" role="menuitem" onClick={() => openAndClose(openBackup)}><Download /><span><b>备份与恢复</b><small>导出或导入行程数据</small></span></button>
      <button type="button" role="menuitem" onClick={() => openAndClose(openSettings)}><Settings /><span><b>出行须知</b><small>查看交通、通信与出行提示</small></span></button>
    </div>}
  </div>;
}
