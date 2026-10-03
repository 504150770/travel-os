'use client';

import { useEffect, useRef } from 'react';

export function useDialogLifecycle<T extends HTMLElement = HTMLDialogElement>(
  close: () => void,
  active = true,
) {
  const ref = useRef<T>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!active) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = ref.current;
    const getFocusable = () => Array.from(
      dialog?.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]',
      ) ?? [],
    ).filter((element) =>
      !element.matches(':disabled') &&
      element.tabIndex >= 0 &&
      element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== 'hidden',
    );
    getFocusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      // A native top-layer Gallery owns its keyboard events, not this drawer.
      const topDialog = event.target instanceof Element
        ? event.target.closest('dialog[open]')
        : null;
      if (topDialog && topDialog !== dialog) return;
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = previousOverflow;
      returnFocus.current?.focus();
    };
  }, [active]);
  return ref;
}
