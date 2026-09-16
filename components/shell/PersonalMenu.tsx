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
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('mousedown', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

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
      {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? <><Check /> Saved</> : ''}
    </span>
    <button
      className="personal-trigger"
      type="button"
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
        <span><b>Saved / Local status</b><small>{online ? 'Saved locally on this device' : 'Offline · local copy available'}</small></span>
        <i className={online ? 'online' : 'offline'} />
      </div>
      <button type="button" role="menuitem" onClick={() => openAndClose(openBackup)}><Download /><span><b>Backup / Export</b><small>Open existing travel backup</small></span></button>
      <button type="button" role="menuitem" onClick={() => openAndClose(openSettings)}><Settings /><span><b>Settings</b><small>Open existing essentials</small></span></button>
    </div>}
  </div>;
}
