'use client';

/* oxlint-disable nextjs/no-img-element -- Private vault Blob URLs must render locally, without an image optimizer. */

import { FileText, Image as ImageIcon, LockKeyhole, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDialogLifecycle } from '@/hooks/use-dialog-lifecycle';
import type { Booking } from '@/lib/types';
import { cityNames } from '@/features/app/appModel';
import { DOCUMENT_CATEGORIES, documentDraftForBooking, formatDocumentSize, validateDocumentFile, type DocumentCategory, type DocumentOpenRequest, type StoredDocument } from '@/features/documents/documentModel';
import { useDocumentVault } from '@/features/documents/useDocumentVault';
import '@/components/readiness/readiness.css';

const labels: Record<DocumentCategory, string> = {
  'Flight ticket': 'Flights', 'Train ticket': 'Trains', 'Hotel confirmation': 'Hotels',
  'Attraction ticket': 'Tickets', Insurance: 'Insurance', 'Visa-related document': 'Visa',
  Reservation: 'Other', 'eSIM / receipt': 'Other', Other: 'Other',
};

export function DocumentsPanel({ bookings, request, onRequestHandled }: {
  bookings: Booking[];
  request?: DocumentOpenRequest | null;
  onRequestHandled?: (token: number) => void;
}) {
  const vault = useDocumentVault();
  const [adding, setAdding] = useState(false);
  const [file, setFile] = useState<File>();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Flight ticket');
  const [city, setCity] = useState('');
  const [dayId, setDayId] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string>();
  const [viewer, setViewer] = useState<StoredDocument>();
  const [viewerUrl, setViewerUrl] = useState<string>();
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [operationError, setOperationError] = useState<string>();
  const closeViewer = () => { setViewer(undefined); setViewerUrl(undefined); };
  const viewerRef = useDialogLifecycle(closeViewer, !!viewerUrl);
  useEffect(() => {
    if (!request) return;
    const booking = bookings.find((item) => item.id === request.bookingId);
    const timer = window.setTimeout(() => {
      if (booking) {
        const draft = documentDraftForBooking(booking);
        setFile(undefined); setTitle(draft.title); setCategory(draft.category);
        setBookingId(draft.bookingId); setCity(''); setDayId(''); setNote('');
        setMessage(undefined); setFormKey(request.token); setAdding(true);
      }
      onRequestHandled?.(request.token);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [bookings, request, onRequestHandled]);
  useEffect(() => {
    if (viewerUrl) return () => URL.revokeObjectURL(viewerUrl);
  }, [viewerUrl]);
  const groups = useMemo(() => ['Flights', 'Trains', 'Hotels', 'Tickets', 'Insurance', 'Visa', 'Other'].map((group) => ({ group, documents: vault.documents.filter((document) => labels[document.category] === group) })).filter((entry) => entry.documents.length), [vault.documents]);
  const reset = () => { setFile(undefined); setTitle(''); setCity(''); setDayId(''); setBookingId(''); setNote(''); setMessage(undefined); setAdding(false); };
  return <section className="documents-panel">
    <header className="readiness-summary compact"><div><span>随身资料</span><h2>{vault.documents.length} 份本机资料</h2><p><LockKeyhole /> 仅保存在此设备，不包含在 JSON 备份中。</p></div><strong>{vault.loading ? '正在读取…' : vault.error ? '本机存储不可用' : '离线可用 ✓'}</strong></header>
    <button className="readiness-primary" disabled={saving} onClick={() => setAdding(!adding)}><Plus /> 添加资料</button>
    {operationError && <p className="document-error" role="alert">{operationError}</p>}
    {adding && <form key={formKey} className="document-add" onSubmit={async (event) => {
      event.preventDefault(); if (!file || savingRef.current) return;
      const issue = validateDocumentFile(file); if (issue) { setMessage(issue); return; }
      savingRef.current = true; setSaving(true); setMessage(undefined);
      const record: StoredDocument = { id: globalThis.crypto?.randomUUID?.() ?? `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: title.trim() || file.name.replace(/\.[^.]+$/, ''), category, city: city || undefined, dayId: dayId ? Number(dayId) : undefined, bookingId: bookingId || undefined, fileName: file.name, mimeType: file.type, size: file.size, addedAt: new Date().toISOString(), note: note.trim() || undefined, blob: file };
      try { await vault.save(record); void navigator.storage?.persist?.()?.catch(() => undefined); reset(); }
      catch { setMessage('未能保存到本机，请保留原文件后重试。'); }
      finally { savingRef.current = false; setSaving(false); }
    }}>
      <label>File<input disabled={saving} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required onChange={(event) => { const next = event.target.files?.[0]; setFile(next); if (next && !title) setTitle(next.name.replace(/\.[^.]+$/, '')); }} /></label>
      <label>Title<input disabled={saving} value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
      <label>Category<select disabled={saving} value={category} onChange={(event) => setCategory(event.target.value as DocumentCategory)}>{DOCUMENT_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
      <div className="document-fields"><label>City<select disabled={saving} value={city} onChange={(event) => setCity(event.target.value)}><option value="">Not linked</option>{cityNames.map((value) => <option key={value}>{value}</option>)}</select></label><label>Day<select disabled={saving} value={dayId} onChange={(event) => setDayId(event.target.value)}><option value="">Not linked</option>{Array.from({ length: 18 }, (_, i) => <option key={i + 1} value={i + 1}>Day {i + 1}</option>)}</select></label></div>
      <label>Booking<select disabled={saving} value={bookingId} onChange={(event) => setBookingId(event.target.value)}><option value="">Not linked</option>{bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.title}</option>)}</select></label>
      <label>Note<textarea disabled={saving} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      {message && <p className="document-error" role="alert">{message}</p>}
      <div><button type="button" disabled={saving} onClick={reset}>Cancel</button><button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save offline'}</button></div>
    </form>}
    {vault.loading ? <p>正在打开本机资料…</p> : vault.error ? <p className="document-error">{vault.error}</p> : !groups.length ? <div className="document-empty"><FileText /><h3>还没有随身资料</h3><p>添加机场、车站或酒店需要出示的票据与确认函。</p></div> : groups.map(({ group, documents }) => <section className="document-group" key={group}><h3>{group}</h3>{documents.map((document) => <article key={document.id}>
      {document.mimeType === 'application/pdf' ? <FileText /> : <ImageIcon />}
      <span><b>{document.title}</b><small>{[document.dayId && `Day ${document.dayId}`, document.city, formatDocumentSize(document.size), 'Offline ✓'].filter(Boolean).join(' · ')}</small></span>
      <button onClick={async () => { setOperationError(undefined); try { const record = await vault.read(document.id); if (record) { setViewer(record); setViewerUrl(URL.createObjectURL(record.blob)); } else setOperationError('这份资料暂时无法读取，请保留原文件并重新添加。'); } catch { setOperationError('无法打开本机资料，请稍后重试。'); } }}>Open</button>
      <button className="document-delete" aria-label={`Delete ${document.title}`} onClick={() => { if (window.confirm(`Delete “${document.title}” from this device?`)) { setOperationError(undefined); void vault.remove(document.id).catch(() => setOperationError('未能删除本机资料，请稍后重试。')); } }}><Trash2 /></button>
    </article>)}</section>)}
    {viewer && viewerUrl && <div className="document-viewer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeViewer()}><dialog ref={viewerRef} open className="document-viewer" aria-modal="true" aria-label={viewer.title}><header><div><span>OFFLINE DOCUMENT</span><h2>{viewer.title}</h2></div><button aria-label="Close document" onClick={closeViewer}><X /></button></header>{viewer.mimeType === 'application/pdf' ? <iframe title={viewer.title} src={viewerUrl} /> : <img src={viewerUrl} alt={viewer.title} />}<footer><a href={viewerUrl} target="_blank" rel="noreferrer">Open full screen</a></footer></dialog></div>}
  </section>;
}
