'use client';

import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { listDocuments, readDocument } from '@/features/documents/documentStore';

export function ContextualDocumentButton({ bookingId, onAdd }: { bookingId: string; onAdd: (bookingId: string) => void }) {
  const [documentId, setDocumentId] = useState<string>();
  const [resolvedBookingId, setResolvedBookingId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () => void listDocuments().then((documents) => {
      if (active) {
        setDocumentId(documents.find((document) => document.bookingId === bookingId)?.id);
        setResolvedBookingId(bookingId);
        setLoading(false); setError(false);
      }
    }).catch(() => { if (active) { setResolvedBookingId(bookingId); setLoading(false); setError(true); } });
    load(); window.addEventListener('travel-documents-changed', load);
    return () => { active = false; window.removeEventListener('travel-documents-changed', load); };
  }, [bookingId]);
  if (loading || resolvedBookingId !== bookingId) return <button className="context-document-button" disabled><FileText /> 正在检查资料…</button>;
  if (error) return <output className="document-error">暂时无法读取本机资料</output>;
  if (!documentId) return <button className="context-document-button" onClick={() => onAdd(bookingId)}><FileText /> 添加此订单资料</button>;
  return <button className="context-document-button" onClick={async () => {
    const record = await readDocument(documentId); if (!record) return;
    const url = URL.createObjectURL(record.blob); window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }}><FileText /> 查看资料</button>;
}

