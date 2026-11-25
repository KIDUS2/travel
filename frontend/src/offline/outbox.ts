import { useSyncExternalStore } from 'react';
import { api } from '../api/api';
import { ApiError } from '../api/client';
import type { MemoryInput, TripInput } from '../api/types';
import { getKeycloak } from '../auth/keycloak';
import { config } from '../config';
import { prepareForUpload } from './compress';
import { onNetworkChange, uploadBlock, type UploadBlock } from './network';

/**
 * The outbox keeps memories saved on this device until they can be uploaded:
 * no network, Wi-Fi-only mode on mobile data, or the upload failed halfway.
 * Everything lives in IndexedDB, so it survives closing the app or restarting the phone.
 * Creating a memory is idempotent on the server (clientId), so a retry never makes a duplicate.
 */
export interface PendingFile { name: string; type: string; blob: Blob }

export interface PendingMemory {
  clientId: string;
  createdAt: number;
  input: MemoryInput;
  tripKey?: string;
  files: PendingFile[];
  uploaded: number;
  memoryId?: string;
  error?: string;
}

interface PendingTrip { key: string; input: TripInput; tripId?: string }

export interface OutboxState {
  items: PendingMemory[];
  syncing: boolean;
  block: UploadBlock;
  progress: { clientId: string; done: number; total: number } | null;
}

const DB = 'teguwaz-offline';
const MEMORIES = 'memories';
const TRIPS = 'trips';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MEMORIES)) db.createObjectStore(MEMORIES, { keyPath: 'clientId' });
      if (!db.objectStoreNames.contains(TRIPS)) db.createObjectStore(TRIPS, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => { db.close(); resolve(req.result); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

const all = <T,>(store: string) => tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);
const put = (store: string, value: unknown) => tx(store, 'readwrite', (s) => s.put(value));
const del = (store: string, key: string) => tx(store, 'readwrite', (s) => s.delete(key));

// ---- state for the UI ----------------------------------------------------

let state: OutboxState = { items: [], syncing: false, block: null, progress: null };
const listeners = new Set<() => void>();
const syncedListeners = new Set<(memoryId: string) => void>();

function emit(patch: Partial<OutboxState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

async function refresh() {
  const items = (await all<PendingMemory>(MEMORIES)).sort((a, b) => a.createdAt - b.createdAt);
  emit({ items, block: uploadBlock() });
}

export function useOutbox(): OutboxState {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, () => state);
}

/** Called after each pending memory reaches the server, so pages can refresh. */
export function onSynced(fn: (memoryId: string) => void) {
  syncedListeners.add(fn);
  return () => { syncedListeners.delete(fn); };
}

// ---- adding --------------------------------------------------------------

export async function enqueueMemory(input: MemoryInput, files: File[], newTrip?: { key: string; input: TripInput }) {
  if (newTrip) {
    const existing = (await all<PendingTrip>(TRIPS)).find((t) => t.key === newTrip.key);
    if (!existing) await put(TRIPS, { key: newTrip.key, input: newTrip.input } satisfies PendingTrip);
  }
  const prepared: PendingFile[] = [];
  for (const f of files) {
    const p = await prepareForUpload(f);
    prepared.push({ name: p.name, type: p.type, blob: p });
  }
  const entry: PendingMemory = {
    clientId: input.clientId ?? crypto.randomUUID(),
    createdAt: Date.now(),
    input: { ...input, clientId: input.clientId ?? undefined },
    tripKey: newTrip?.key,
    files: prepared,
    uploaded: 0,
  };
  entry.input.clientId = entry.clientId;
  await put(MEMORIES, entry);
  await refresh();
  void syncOutbox();
}

export async function removePending(clientId: string) {
  await del(MEMORIES, clientId);
  await refresh();
}

// ---- syncing -------------------------------------------------------------

function signedIn() {
  if (config.demoMode) return true;
  return !!getKeycloak().authenticated;
}

function isNetworkError(e: unknown) {
  return e instanceof TypeError || (e instanceof ApiError && (e.status === 0 || e.status >= 502));
}

let running = false;

/** Uploads what it can. `override` uploads on mobile data even in Wi-Fi-only mode (the traveler asked). */
export async function syncOutbox(override = false) {
  if (running) return;
  const block = uploadBlock(override);
  if (block || !signedIn()) { await refresh(); return; }
  running = true;
  emit({ syncing: true, block: null });
  try {
    const items = (await all<PendingMemory>(MEMORIES)).sort((a, b) => a.createdAt - b.createdAt);
    const trips = await all<PendingTrip>(TRIPS);
    for (const item of items) {
      try {
        item.error = undefined;
        if (item.tripKey && !item.input.tripId) {
          const trip = trips.find((t) => t.key === item.tripKey);
          if (trip) {
            if (!trip.tripId) {
              trip.tripId = (await api.createTrip(trip.input)).id;
              await put(TRIPS, trip);
            }
            item.input.tripId = trip.tripId;
            await put(MEMORIES, item);
          }
        }
        if (!item.memoryId) {
          item.memoryId = (await api.createMemory(item.input)).id;
          await put(MEMORIES, item);
        }
        while (item.uploaded < item.files.length) {
          if (uploadBlock(override)) throw new TypeError('connection changed');
          emit({ progress: { clientId: item.clientId, done: item.uploaded, total: item.files.length } });
          const f = item.files[item.uploaded];
          await api.uploadMedia(item.memoryId, new File([f.blob], f.name, { type: f.type }));
          item.uploaded += 1;
          await put(MEMORIES, item);
        }
        await del(MEMORIES, item.clientId);
        syncedListeners.forEach((l) => l(item.memoryId!));
      } catch (e) {
        if (isNetworkError(e)) break; // try again when the connection is back
        item.error = e instanceof Error ? e.message : 'Upload failed';
        await put(MEMORIES, item);
      }
    }
    // Forget trips that no pending memory still needs.
    const left = await all<PendingMemory>(MEMORIES);
    for (const t of await all<PendingTrip>(TRIPS)) {
      if (!left.some((m) => m.tripKey === t.key)) await del(TRIPS, t.key);
    }
  } finally {
    running = false;
    emit({ syncing: false, progress: null });
    await refresh();
  }
}

let started = false;

/** Starts background syncing: on reconnect, on Wi-Fi, when the app comes back to the front, and every minute. */
export function startOutbox() {
  if (started) return;
  started = true;
  void refresh().then(() => syncOutbox());
  onNetworkChange(() => { void syncOutbox(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void syncOutbox(); });
  window.setInterval(() => { if (state.items.length) void syncOutbox(); }, 60_000);
}
