'use client';

import { Check, Download, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

type PackManifest = { version: string; assetCount: number; totalBytes: number };
type PackState = { status: 'idle' | 'downloading' | 'ready' | 'error'; done: number; total: number; version?: string; updatedAt?: string };
const STORAGE_KEY = 'europe-travel-offline-pack-v1';
const sizeLabel = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function OfflinePackControl() {
  const [manifest, setManifest] = useState<PackManifest | null>(null);
  const [state, setState] = useState<PackState>({ status: 'idle', done: 0, total: 0 });
  useEffect(() => {
    fetch('/offline-core.json', { cache: 'no-store' }).then((response) => response.json() as Promise<PackManifest>).then(setManifest).catch(() => undefined);
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) setState(JSON.parse(saved) as PackState); } catch { /* unavailable */ }
  }, []);
  useEffect(() => { if (state.status === 'ready') localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  const download = async () => {
    if (!manifest || !('serviceWorker' in navigator)) return;
    const worker = (await navigator.serviceWorker.ready).active;
    if (!worker) return;
    const channel = new MessageChannel();
    setState({ status: 'downloading', done: 0, total: manifest.assetCount });
    channel.port1.onmessage = ({ data }) => {
      if (data.type === 'progress') setState({ status: 'downloading', done: data.done, total: data.total });
      if (data.type === 'complete') setState({ status: 'ready', done: data.total, total: data.total, version: data.version, updatedAt: data.updatedAt });
      if (data.type === 'error') setState((current) => ({ ...current, status: 'error' }));
    };
    const staticAssets = performance.getEntriesByType('resource').map((entry) => new URL(entry.name))
      .filter((url) => url.origin === location.origin && /\.(?:css|js|woff2?)(?:\?|$)/i.test(url.pathname))
      .map((url) => `${url.pathname}${url.search}`);
    worker.postMessage({ type: 'DOWNLOAD_OFFLINE_PACK', version: manifest.version, staticAssets }, [channel.port2]);
  };
  const ready = state.status === 'ready' && state.version === manifest?.version;
  return <article className="offline-pack-control">
    {ready ? <Check /> : state.status === 'downloading' ? <RefreshCw className="offline-spin" /> : <Download />}
    <h2>{ready ? 'TRIP AVAILABLE OFFLINE' : 'DOWNLOAD TRIP OFFLINE'}</h2>
    <p>{manifest ? `${manifest.assetCount} core assets · ${sizeLabel(manifest.totalBytes)}` : 'Calculating core pack…'}{state.updatedAt && ` · Updated ${new Date(state.updatedAt).toLocaleString()}`}</p>
    {state.status === 'downloading' && <progress value={state.done} max={state.total || 1} aria-label="Offline pack download progress" />}
    <button onClick={download} disabled={!manifest || state.status === 'downloading'}>{state.status === 'downloading' ? `${state.done} / ${state.total} assets` : ready ? 'Update Offline Pack' : 'Download Trip Offline'}</button>
    {state.status === 'error' && <small>Download paused. Reconnect and try again.</small>}
  </article>;
}
