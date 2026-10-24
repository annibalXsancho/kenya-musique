import PocketBase, { ClientResponseError } from 'pocketbase';
import { useSyncExternalStore } from 'react';

/** Même origine que l'app : proxy Vite en dev, PocketBase lui-même en production. */
export const pb = new PocketBase(window.location.origin);
pb.autoCancellation(false);

export interface CurrentUser {
  id: string;
  email: string;
}

function snapshot(): CurrentUser | null {
  const r = pb.authStore.record;
  return r ? { id: r.id, email: String(r.email ?? '') } : null;
}

// Snapshot stable tant que la session ne change pas (exigence de useSyncExternalStore).
let cached = snapshot();
function current(): CurrentUser | null {
  const next = snapshot();
  if (next?.id !== cached?.id) cached = next;
  return cached;
}
const subscribe = (cb: () => void) => pb.authStore.onChange(cb);

/** Utilisateur connecté (session conservée dans le navigateur, y compris hors ligne). */
export function useUser(): CurrentUser | null {
  return useSyncExternalStore(subscribe, current);
}

export async function login(email: string, password: string): Promise<void> {
  try {
    await pb.collection('users').authWithPassword(email.trim(), password);
  } catch (e) {
    if (e instanceof ClientResponseError) {
      if (e.status === 0)
        throw new Error('Serveur injoignable. Vérifie la connexion.', { cause: e });
      if (e.status === 400 || e.status === 401)
        throw new Error('E-mail ou mot de passe incorrect.', { cause: e });
    }
    throw new Error('Connexion impossible.', { cause: e });
  }
}

export function logout(): void {
  pb.authStore.clear();
}

/** Renouvelle le jeton à l'ouverture. Hors ligne : on garde la session. Compte supprimé : on la ferme. */
export async function refreshSession(): Promise<void> {
  if (!pb.authStore.record) return;
  try {
    await pb.collection('users').authRefresh();
  } catch (e) {
    if (
      e instanceof ClientResponseError &&
      (e.status === 401 || e.status === 403 || e.status === 404)
    )
      logout();
  }
}
