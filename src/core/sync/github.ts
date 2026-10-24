import { b64decode, b64encode } from '../lib/base64';
import { AuthError, NetworkError } from './types';

export interface GithubConfig {
  /** « propriétaire/dépôt » du dépôt PRIVÉ qui contient les données. */
  repo: string;
  token: string;
  apiBase?: string;
}

/** Quelqu'un a modifié le fichier entre notre lecture et notre écriture. */
export class ConflictError extends Error {}

export type FileRead = { sha: string; etag: string | null; bytes: Uint8Array };

/** Client minimal de l'API « contents » de GitHub (lecture et écriture de fichiers du dépôt de données). */
export function githubApi(
  getConfig: () => GithubConfig,
  fetchImpl: typeof fetch = (...a) => fetch(...a),
) {
  async function request(
    path: string,
    init: RequestInit & { accept?: string } = {},
  ): Promise<Response> {
    const c = getConfig();
    let res: Response;
    try {
      res = await fetchImpl(`${c.apiBase ?? 'https://api.github.com'}/repos/${c.repo}/${path}`, {
        ...init,
        cache: 'no-store', // pas de cache navigateur : on gère nous-mêmes les ETag
        headers: {
          Authorization: `Bearer ${c.token}`,
          Accept: init.accept ?? 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(init.headers as Record<string, string>),
        },
      });
    } catch (e) {
      throw new NetworkError('Réseau injoignable', { cause: e });
    }
    if (res.status === 401) throw new AuthError('Jeton refusé ou expiré.');
    if (res.status === 403 || res.status === 429) {
      if (
        res.status === 429 ||
        res.headers.get('x-ratelimit-remaining') === '0' ||
        res.headers.get('retry-after')
      )
        throw new NetworkError('Limite GitHub atteinte, nouvel essai plus tard.');
      throw new AuthError(
        'Accès refusé : le jeton doit avoir « Contents : lecture et écriture » sur le dépôt de données.',
      );
    }
    if (res.status >= 500) throw new NetworkError(`GitHub indisponible (${res.status}).`);
    return res;
  }

  /** `null` si le fichier n'existe pas ; `'unchanged'` si l'ETag fourni est toujours à jour. */
  async function getFile(
    path: string,
    etag?: string | null,
  ): Promise<FileRead | null | 'unchanged'> {
    const res = await request(`contents/${path}`, {
      headers: etag ? { 'If-None-Match': etag } : {},
    });
    if (res.status === 304) return 'unchanged';
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub a répondu ${res.status}`);
    const json = (await res.json()) as {
      sha: string;
      size: number;
      encoding?: string;
      content?: string;
    };
    let bytes: Uint8Array;
    if (json.size === 0) bytes = new Uint8Array();
    else if (json.encoding === 'base64' && json.content) bytes = b64decode(json.content);
    else {
      // Fichier de plus de 1 Mo : l'API ne renvoie pas le contenu en JSON, on le demande brut.
      const raw = await request(`contents/${path}`, { accept: 'application/vnd.github.raw+json' });
      if (!raw.ok) throw new Error(`GitHub a répondu ${raw.status}`);
      bytes = new Uint8Array(await raw.arrayBuffer());
    }
    return { sha: json.sha, etag: res.headers.get('etag'), bytes };
  }

  async function putFile(
    path: string,
    bytes: Uint8Array,
    sha: string | undefined,
    message: string,
  ): Promise<void> {
    const res = await request(`contents/${path}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, content: b64encode(bytes), ...(sha ? { sha } : {}) }),
    });
    if (res.status === 409 || res.status === 422) throw new ConflictError(`Conflit sur ${path}`);
    if (!res.ok) throw new Error(`GitHub a répondu ${res.status}`);
  }

  return { getFile, putFile };
}

export type GithubApi = ReturnType<typeof githubApi>;
