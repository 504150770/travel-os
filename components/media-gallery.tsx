'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { GalleryRequest } from '@/lib/media';

export function MediaGallery({
  gallery,
  close,
}: {
  gallery: GalleryRequest | null;
  close: () => void;
}) {
  const [index, setIndex] = useState(gallery?.index ?? 0);
  const touchStart = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const count = gallery?.images.length ?? 0;

  useEffect(() => {
    if (!gallery) return;
    setIndex(gallery.index);
  }, [gallery]);

  useEffect(() => {
    if (!gallery) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    triggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      if (dialog.open) dialog.close();
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      window.scrollTo({ top: scrollY, behavior: 'instant' });
      window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'instant' }));
      window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
    };
  }, [gallery]);

  useEffect(() => {
    if (!gallery || count < 2) return;
    const adjacent = [
      gallery.images[(index - 1 + count) % count],
      gallery.images[(index + 1) % count],
    ];
    adjacent.forEach((image) => {
      const preload = new window.Image();
      preload.src = image.file;
    });
  }, [count, gallery, index]);

  if (!gallery || !count) return null;
  const image = gallery.images[index];
  const move = (delta: number) =>
    setIndex((current) => (current + delta + count) % count);

  return (
    <dialog
      ref={dialogRef}
      className="media-gallery"
      aria-modal="true"
      aria-label={`${gallery.name} photos`}
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' && count > 1) move(-1);
        if (event.key === 'ArrowRight' && count > 1) move(1);
      }}
      onTouchStart={(event) => {
        touchStart.current = event.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const end = event.changedTouches[0]?.clientX;
        touchStart.current = null;
        if (start == null || end == null || Math.abs(end - start) < 45) return;
        move(end < start ? 1 : -1);
      }}
    >
      <header>
        <div>
          <b>{gallery.name}</b>
          <span>{index + 1} / {count}</span>
        </div>
        <button onClick={close} aria-label="Close gallery"><X /></button>
      </header>
      <div className="media-gallery-stage">
        <Image
          unoptimized
          key={image.file}
          src={image.file}
          alt={image.title || image.caption}
          fill
          sizes="100vw"
          priority
        />
        {count > 1 && (
          <>
            <button className="media-gallery-prev" onClick={() => move(-1)} aria-label="Previous photo"><ChevronLeft /></button>
            <button className="media-gallery-next" onClick={() => move(1)} aria-label="Next photo"><ChevronRight /></button>
          </>
        )}
      </div>
      <footer>
        <div>
          <span>{image.role.replace('-', ' ')}</span>
          <h2>{image.title}</h2>
          <p>{image.caption}</p>
        </div>
        <div className="media-gallery-dots" aria-label="Photo position">
          {gallery.images.map((item, itemIndex) => (
            <button
              key={`${item.file}-${itemIndex}`}
              aria-label={`View photo ${itemIndex + 1}`}
              aria-current={itemIndex === index}
              onClick={() => setIndex(itemIndex)}
            />
          ))}
        </div>
      </footer>
    </dialog>
  );
}
