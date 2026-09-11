'use client';

import { FileText, Image as ImageIcon, LockKeyhole, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Booking } from '@/lib/types';
import { cityNames } from '@/features/app/appModel';
import { DOCUMENT_CATEGORIES, formatDocumentSize, validateDocumentFile, type DocumentCategory, type StoredDocument } from '@/features/documents/documentModel';
import { useDocumentVault } from '@/features/documents/useDocumentVault';
import '@/components/readiness/readiness.css';

const labels: Record<DocumentCategory, string> = {
  'Flight ticket': 'Flights', 'Train ticket': 'Trains', 'Hotel confirmation': 'Hotels',
  'Attraction ticket': 'Tickets', Insurance: 'Insurance', 'Visa-related document': 'Visa',
  Reservation: 'Other', 'eSIM / receipt': 'Other', Other: 'Other',
};

export function DocumentsPanel({ bookings }: { bookings: Booking[] }) {
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
  useEffect(() => {
    if (!viewer) { setViewerUrl(undefined); return; }
    const url = URL.createObjectURL(viewer.blob); setViewerUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [viewer]);
  const groups = useMemo(() => ['Flights', 'Trains', 'Hotels', 'Tickets', 'Insurance', 'Visa', 'Other'].map((group) => ({ group, documents: vault.documents.filter((document) => labels[document.category] === group) })).filter((entry) => entry.documents.length), [vault.documents]);
  const reset = () => { setFile(undefined); setTitle(''); setCity(''); setDayId(''); setBookingId(''); setNote(''); setMessage(undefined); setAdding(false); };
  return <section className="documents-panel">
    <header className="readiness-summary compact"><div><span>LOCAL DOCUMENT VAULT</span><h2>{vault.documents.length} Documents</h2><p><LockKeyhole /> Stored locally on this device. Never included in JSON backup.</p></div><strong>Offline ✓</strong></header>
    <button className="readiness-primary" onClick={() => setAdding(!adding)}><Plus /> Add document</button>
    {adding && <form className="document-add" onSubmit={async (event) => {
      event.preventDefault(); if (!file) return;
      const issue = validateDocumentFile(file); if (issue) { setMessage(issue); return; }
      const record: StoredDocument = { id: globalThis.crypto?.randomUUID?.() ?? `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: title.trim() || file.name.replace(/\.[^.]+$/, ''), category, city: city || undefined, dayId: dayId ? Number(dayId) : undefined, bookingId: bookingId || undefined, fileName: file.name, mimeType: file.type, size: file.size, addedAt: new Date().toISOString(), note: note.trim() || undefined, blob: file };
      try { await vault.save(record); void navigator.storage?.persist?.(); reset(); } catch { setMessage('Could not save this document locally.'); }
    }}>
      <label>File<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required onChange={(event) => { const next = event.target.files?.[0]; setFile(next); if (next && !title) setTitle(next.name.replace(/\.[^.]+$/, '')); }} /></label>
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
      <label>Category<select value={category} onChange={(event) => setCategory(event.target.value as DocumentCategory)}>{DOCUMENT_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
      <div className="document-fields"><label>City<select value={city} onChange={(event) => setCity(event.target.value)}><option value="">Not linked</option>{cityNames.map((value) => <option key={value}>{value}</option>)}</select></label><label>Day<select value={dayId} onChange={(event) => setDayId(event.target.value)}><option value="">Not linked</option>{Array.from({ length: 18 }, (_, i) => <option key={i + 1} value={i + 1}>Day {i + 1}</option>)}</select></label></div>
      <label>Booking<select value={bookingId} onChange={(event) => setBookingId(event.target.value)}><option value="">Not linked</option>{bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.title}</option>)}</select></label>
      <label>Note<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
      {message && <p className="document-error">{message}</p>}
      <div><button type="button" onClick={reset}>Cancel</button><button type="submit">Save offline</button></div>
    </form>}
    {vault.loading ? <p>Opening local vault…</p> : vault.error ? <p className="document-error">{vault.error}</p> : !groups.length ? <div className="document-empty"><FileText /><h3>No local documents yet</h3><p>Add the ticket or confirmation you need at the airport, station or hotel.</p></div> : groups.map(({ group, documents }) => <section className="document-group" key={group}><h3>{group}</h3>{documents.map((document) => <article key={document.id}>
      {document.mimeType === 'application/pdf' ? <FileText /> : <ImageIcon />}
      <span><b>{document.title}</b><small>{[document.dayId && `Day ${document.dayId}`, document.city, formatDocumentSize(document.size), 'Offline ✓'].filter(Boolean).join(' · ')}</small></span>
      <button onClick={async () => { const record = await vault.read(document.id); if (record) setViewer(record); }}>Open</button>
      <button className="document-delete" aria-label={`Delete ${document.title}`} onClick={() => { if (window.confirm(`Delete “${document.title}” from this device?`)) void vault.remove(document.id); }}><Trash2 /></button>
    </article>)}</section>)}
    {viewer && viewerUrl && <div className="document-viewer-backdrop" role="presentation" onClick={() => setViewer(undefined)}><section className="document-viewer" role="dialog" aria-modal="true" aria-label={viewer.title} onClick={(event) => event.stopPropagation()}><header><div><span>OFFLINE DOCUMENT</span><h2>{viewer.title}</h2></div><button aria-label="Close document" onClick={() => setViewer(undefined)}><X /></button></header>{viewer.mimeType === 'application/pdf' ? <iframe title={viewer.title} src={viewerUrl} /> : <img src={viewerUrl} alt={viewer.title} />}<footer><a href={viewerUrl} target="_blank" rel="noreferrer">Open full screen</a></footer></section></div>}
  </section>;
}
