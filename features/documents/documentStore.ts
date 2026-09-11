import type { DocumentMetadata, StoredDocument } from '@/features/documents/documentModel';

export const DOCUMENT_DB_NAME = 'travel-os-local-documents-v1';
const STORE = 'documents';
const CHANGE_EVENT = 'travel-documents-changed';

const requestResult = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('Local document request failed'));
});

export function openDocumentDatabase(factory: IDBFactory = indexedDB) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(DOCUMENT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('bookingId', 'bookingId', { unique: false });
      store.createIndex('dayId', 'dayId', { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open local document storage'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>, factory?: IDBFactory) {
  const db = await openDocumentDatabase(factory);
  try {
    const transaction = db.transaction(STORE, mode);
    const result = await requestResult(run(transaction.objectStore(STORE)));
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Local document transaction failed'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Local document transaction aborted'));
    });
    return result;
  } finally {
    db.close();
  }
}

const metadataOnly = ({ blob: _blob, ...metadata }: StoredDocument): DocumentMetadata => metadata;

export async function saveDocument(record: StoredDocument, factory?: IDBFactory) {
  await withStore('readwrite', (store) => store.put(record), factory);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT));
}
export const readDocument = (id: string, factory?: IDBFactory) =>
  withStore<StoredDocument | undefined>('readonly', (store) => store.get(id), factory);
export const listDocuments = async (factory?: IDBFactory) =>
  (await withStore<StoredDocument[]>('readonly', (store) => store.getAll(), factory))
    .map(metadataOnly).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
export async function deleteDocument(id: string, factory?: IDBFactory) {
  await withStore('readwrite', (store) => store.delete(id), factory);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT));
}
export const onDocumentsChanged = (listener: () => void) => {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
};

