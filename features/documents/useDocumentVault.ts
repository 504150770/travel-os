'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DocumentMetadata, StoredDocument } from '@/features/documents/documentModel';
import { deleteDocument, listDocuments, onDocumentsChanged, readDocument, saveDocument } from '@/features/documents/documentStore';

export function useDocumentVault() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const refresh = useCallback(async () => {
    try { setDocuments(await listDocuments()); setError(undefined); }
    catch { setError('Local document storage is unavailable in this browser.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    const unsubscribe = onDocumentsChanged(() => void refresh());
    return () => { window.clearTimeout(timer); unsubscribe(); };
  }, [refresh]);
  const save = async (record: StoredDocument) => { await saveDocument(record); await refresh(); };
  const remove = async (id: string) => { await deleteDocument(id); await refresh(); };
  return { documents, loading, error, save, remove, read: readDocument, refresh };
}
