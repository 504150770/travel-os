'use client';

import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { listDocuments, readDocument } from '@/features/documents/documentStore';

export function ContextualDocumentButton({ bookingId }: { bookingId: string }) {
  const [documentId, setDocumentId] = useState<string>();
  useEffect(() => {
    let active = true;
    const load = () => void listDocuments().then((documents) => {
      if (active) setDocumentId(documents.find((document) => document.bookingId === bookingId)?.id);
    }).catch(() => undefined);
    load(); window.addEventListener('travel-documents-changed', load);
    return () => { active = false; window.removeEventListener('travel-documents-changed', load); };
  }, [bookingId]);
  if (!documentId) return null;
  return <button className="context-document-button" onClick={async () => {
    const record = await readDocument(documentId); if (!record) return;
    const url = URL.createObjectURL(record.blob); window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }}><FileText /> View Document</button>;
}

