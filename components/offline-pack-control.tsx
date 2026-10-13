'use client';

import { Check, Download, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type PackManifest = { version: string; assetCount: number; totalBytes: number; assets?: string[] };
type PackState = { status: 'idle' | 'downloading' | 'ready' | 'error'; done: number; total: number; version?: string; updatedAt?: string; totalBytes?: number };
const sizeLabel = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function OfflinePackControl() {
  const [manifest, setManifest] = useState<PackManifest | null>(null);
  const [state, setState] = useState<PackState>({ status: 'idle', done: 0, total: 0 });
  const busy = useRef(false);
  const disconnect = useRef<() => void>(() => undefined);
  const connect = useCallback(async (downloadManifest?: PackManifest) => {
    if (downloadManifest && busy.current) return;
    disconnect.current();
    let cancelled = false;
    const timing: { timer?: ReturnType<typeof setTimeout> } = {};
    const channel = new MessageChannel();
    const close = () => {
      cancelled = true;
      busy.current = false;
      clearTimeout(timing.timer);
      channel.port1.close();
    };
    disconnect.current = close;
    const fail = () => {
      if (cancelled) return;
      setState((current) => ({ ...current, status: 'error' }));
      close();
    };
    const watch = (delay: number) => { clearTimeout(timing.timer); timing.timer = setTimeout(fail, delay); };
    busy.current = Boolean(downloadManifest);
    await Promise.resolve();
    if (cancelled) return;
    if (downloadManifest) setState((current) => ({ ...current, status: 'downloading', done: 0, total: downloadManifest.assetCount }));
    watch(10000);
    try {
      if (!('serviceWorker' in navigator)) throw new Error('Service worker unavailable');
      const worker = (await navigator.serviceWorker.ready).active;
      if (cancelled) return;
      if (!worker) throw new Error('Service worker unavailable');
      channel.port1.onmessage = ({ data }) => {
        if (cancelled) return;
        if (data.type === 'progress') {
          busy.current = true;
          setState((current) => ({ ...current, status: 'downloading', done: data.done, total: data.total }));
          watch(65000);
          return;
        }
        const pack = data.type === 'complete' ? data : data.pack;
        setState({ status: data.type === 'error' ? 'error' : pack ? 'ready' : 'idle', done: pack?.total || 0, total: pack?.total || 0, version: pack?.version, updatedAt: pack?.updatedAt, totalBytes: pack?.totalBytes });
        if (data.type === 'complete') setManifest({ version: data.version, assetCount: data.total, totalBytes: data.totalBytes });
        close();
      };
      watch(65000);
      worker.postMessage({ type: downloadManifest ? 'DOWNLOAD_OFFLINE_PACK' : 'GET_OFFLINE_PACK_STATUS' }, [channel.port2]);
    } catch { fail(); }
  }, []);
  useEffect(() => {
    let cancelled = false;
    const load = async (url: string): Promise<PackManifest> => {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Offline manifest unavailable');
      return response.json();
    };
    Promise.all([load('/offline-core.json'), load('/_next/static/offline-app.json')])
      .then(([media, app]) => {
        if (!cancelled) setManifest({ version: `${media.version}-${app.version}`, assetCount: media.assets && app.assets ? new Set([...media.assets, ...app.assets]).size : media.assetCount + app.assetCount, totalBytes: media.totalBytes + app.totalBytes });
      })
      .catch(() => { if (!cancelled) setState((current) => ({ ...current, status: current.status === 'downloading' ? 'downloading' : 'error' })); });
    void Promise.resolve().then(() => { if (!cancelled) void connect(); });
    return () => { cancelled = true; disconnect.current(); };
  }, [connect]);
  const ready = Boolean(state.version) && state.status !== 'downloading';
  const resourceCount = ready ? state.total : manifest?.assetCount;
  const resourceBytes = ready ? state.totalBytes : manifest?.totalBytes;
  return <article className="offline-pack-control">
    {ready ? <Check /> : state.status === 'downloading' ? <RefreshCw className="offline-spin" /> : <Download />}
    <h2>{ready ? '离线行程已就绪' : '下载离线行程'}</h2>
    <p>{resourceCount ? `${resourceCount} 项核心资源${resourceBytes !== undefined ? ` · ${sizeLabel(resourceBytes)}` : ''}` : '正在计算离线资源…'}{state.updatedAt && ` · 更新于 ${new Date(state.updatedAt).toLocaleString()}`}</p>
    {state.status === 'downloading' && <progress value={state.done} max={state.total || 1} aria-label="Offline pack download progress" />}
    <button onClick={() => { if (manifest) void connect(manifest); }} disabled={!manifest || state.status === 'downloading'}>{state.status === 'downloading' ? `${state.done} / ${state.total} 项资源` : ready ? '更新离线行程' : '下载离线行程'}</button>
    {state.status === 'error' && <small>{ready ? '更新未完成，之前的离线行程仍可用。请重新连接网络后重试。' : '下载已暂停，请重新连接网络后重试。'}</small>}
  </article>;
}
