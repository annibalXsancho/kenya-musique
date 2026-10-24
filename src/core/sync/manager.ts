import { useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { COLLECTIONS } from '../model';
import { db, notifyLocalWrite, onLocalWrite } from '../db';
import { logout, pb, refreshSession } from '../auth/client';
import { createEngine } from './engine';
import { pocketbaseRemote } from './pocketbaseRemote';
import { AuthError, NetworkError } from './types';

type Phase = 'idle' | 'syncing' | 'offline' | 'error';
interface State {
  phase: Phase;
  lastSyncAt: string | null;
}

let state: State = { phase: 'idle', lastSyncAt: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

const engine = createEngine(db, pocketbaseRemote(pb));

export async function syncNow(): Promise<void> {
  set({ phase: 'syncing' });
  try {
    const r = await engine.sync();
    set({ phase: r.errors > 0 ? 'error' : 'idle', lastSyncAt: new Date().toISOString() });
  } catch (e) {
    if (e instanceof AuthError) {
      await refreshSession();
      if (!pb.authStore.isValid) logout(); // session expirée : retour à l'écran de connexion, données locales conservées
      set({ phase: 'offline' });
    } else if (e instanceof NetworkError) set({ phase: 'offline' });
    else set({ phase: 'error' });
  }
}

/** Déclencheurs §8 : ouverture, retour du réseau, après écriture (2 s), toutes les 60 s, temps réel. */
export function startSync(): () => void {
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const trigger = () => void syncNow();
  const afterWrite = () => {
    clearTimeout(debounce);
    debounce = setTimeout(trigger, 2000);
  };
  const onVisible = () => document.visibilityState === 'visible' && trigger();

  void refreshSession().then(trigger);
  const offWrite = onLocalWrite(afterWrite);
  const timer = setInterval(trigger, 60_000);
  window.addEventListener('online', trigger);
  document.addEventListener('visibilitychange', onVisible);

  // Temps réel : un changement distant déclenche une réception (le SDK rétablit la connexion seul).
  // Abonnements enchaînés un par un : en parallèle, le SDK annule et rouvre la connexion.
  let stopped = false;
  void (async () => {
    for (const c of COLLECTIONS) {
      if (stopped) return;
      await pb
        .collection(c)
        .subscribe('*', trigger)
        .catch(() => undefined);
    }
  })();

  return () => {
    stopped = true;
    clearTimeout(debounce);
    clearInterval(timer);
    offWrite();
    window.removeEventListener('online', trigger);
    document.removeEventListener('visibilitychange', onVisible);
    void pb.realtime.unsubscribe().catch(() => undefined);
  };
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};

export function useSyncStatus() {
  const s = useSyncExternalStore(subscribe, () => state);
  const online = useSyncExternalStore(
    (cb) => {
      window.addEventListener('online', cb);
      window.addEventListener('offline', cb);
      return () => {
        window.removeEventListener('online', cb);
        window.removeEventListener('offline', cb);
      };
    },
    () => navigator.onLine,
  );
  const pending =
    useLiveQuery(
      async () =>
        (await db.outbox.count()) + (await db.blobs.where('status').equals('pending').count()),
      [],
    ) ?? 0;
  const status = !online || s.phase === 'offline' ? 'offline' : pending > 0 ? 'pending' : 'synced';
  return { status, pending, phase: s.phase, lastSyncAt: s.lastSyncAt } as const;
}

export { notifyLocalWrite };
