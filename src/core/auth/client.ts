import { useSyncExternalStore } from 'react';
import type { GithubConfig } from '../sync/github';

/**
 * « Connexion » = dépôt de données + jeton d'accès GitHub, gardés dans ce navigateur (localStorage).
 * Le jeton n'est envoyé qu'à api.github.com. Un jeton « fine-grained » limité à UN dépôt (Contents : lecture/écriture)
 * est conseillé : s'il fuite, seules les données de l'outil sont concernées.
 */
const KEY = 'outil.github';

function load(): GithubConfig | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return v?.repo && v?.token
      ? { repo: v.repo, token: v.token, ...(v.apiBase ? { apiBase: v.apiBase } : {}) }
      : null;
  } catch {
    return null;
  }
}

let config = load();
let notice = '';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getConfig = () => config;
export const getNotice = () => notice;

export interface Account {
  repo: string;
}
let account: Account | null = config ? { repo: config.repo } : null;
const snapshot = () => account;
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};

/** Compte connecté sur cet appareil (reste utilisable hors ligne). */
export function useAccount(): Account | null {
  return useSyncExternalStore(subscribe, snapshot);
}

function setConfig(next: GithubConfig | null, why = '') {
  config = next;
  notice = why;
  account = next ? { repo: next.repo } : null;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* stockage indisponible : la session ne survivra pas au rechargement */
  }
  emit();
}

const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

/** Vérifie le dépôt et le jeton, puis enregistre la connexion. Refuse un dépôt public. */
export async function login(repo: string, token: string): Promise<void> {
  const r = repo
    .trim()
    .replace(/^https:\/\/github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
  const t = token.trim();
  if (!REPO_RE.test(r)) throw new Error('Dépôt invalide : écris « propriétaire/dépôt ».');
  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${r}`, {
      headers: { Authorization: `Bearer ${t}`, Accept: 'application/vnd.github+json' },
      cache: 'no-store',
    });
  } catch (e) {
    throw new Error('GitHub injoignable. Vérifie la connexion.', { cause: e });
  }
  if (res.status === 401) throw new Error('Jeton refusé.');
  if (res.status === 404 || res.status === 403)
    throw new Error('Dépôt introuvable, ou le jeton n’y a pas accès.');
  if (!res.ok) throw new Error(`GitHub a répondu ${res.status}.`);
  const info = (await res.json()) as { private?: boolean; permissions?: { push?: boolean } };
  if (!info.private)
    throw new Error(
      'Ce dépôt est public : tes données seraient visibles de tous. Utilise un dépôt privé.',
    );
  if (info.permissions && !info.permissions.push)
    throw new Error('Le jeton n’a pas le droit d’écrire dans ce dépôt.');
  setConfig({ repo: r, token: t });
}

/** Déconnecte cet appareil. Les données locales sont conservées. */
export function logout(why = ''): void {
  setConfig(null, why);
}
