import { useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, notifyLocalWrite, onLocalWrite } from '../db';
import { getConfig, logout } from '../auth/client';
import { createEngine } from './engine';
import { githubApi } from './github';
import { githubRemote } from './githubRemote';
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

const api = githubApi(() => {
  const c = getConfig();
  if (!c) throw new AuthError('Non connecté.');
  return c;
});
const engine = createEngine(db, githubRemote(api));

export async function syncNow(): Promise<void> {
  if (!getConfig()) return;
  set({ phase: 'syncing' });
  try {
    const r = await engine.sync();
    set({ phase: r.errors > 0 ? 'error' : 'idle', lastSyncAt: new Date().toISOString() });
  } catch (e) {
    if (e instanceof AuthError) {
      // Jeton refusé ou expiré : retour à l'écran de connexion, données locales conservées.
      logout(e.message);
      set({ phase: 'idle' });
    } else if (e instanceof NetworkError) set({ phase: 'offline' });
    else set({ phase: 'error' });
  }
}

/** Déclencheurs §8 : ouverture, retour du réseau, après écriture (2 s), toutes les 60 s, retour au premier plan. */
export function startSync(): () => void {
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const trigger = () => void syncNow();
  const afterWrite = () => {
    clearTimeout(debounce);
    debounce = setTimeout(trigger, 2000);
  };
  const onVisible = () => document.visibilityState === 'visible' && trigger();

  trigger();
  const offWrite = onLocalWrite(afterWrite);
  const timer = setInterval(trigger, 60_000);
  window.addEventListener('online', trigger);
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    clearTimeout(debounce);
    clearInterval(timer);
    offWrite();
    window.removeEventListener('online', trigger);
    document.removeEventListener('visibilitychange', onVisible);
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
