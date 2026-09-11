'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useDialogLifecycle } from '@/hooks/use-dialog-lifecycle';

export function MobileSheet({
  open,
  close,
  title,
  eyebrow,
  children,
  className = '',
}: {
  open: boolean;
  close: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  const dialogRef = useDialogLifecycle(close, open);
  if (!open) return null;
  return (
    <div
      className="mobile-sheet-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <dialog
        ref={dialogRef}
        open
        className={`mobile-sheet ${className}`}
        aria-modal="true"
        aria-label={title}
      >
        <span className="mobile-sheet-handle" aria-hidden="true" />
        <header className="mobile-sheet-header">
          <div>
            {eyebrow && <span>{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          <button onClick={close} aria-label="关闭">
            <X />
          </button>
        </header>
        <div className="mobile-sheet-body">{children}</div>
      </dialog>
    </div>
  );
}
