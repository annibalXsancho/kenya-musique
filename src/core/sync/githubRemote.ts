import type { CollectionName } from '../model';
import { ConflictError } from './github';
import type { GithubApi } from './github';
import type { AnyDoc, Remote } from './types';

const enc = new TextEncoder();
const dec = new TextDecoder();

const collectionPath = (c: CollectionName) => `data/${c}.json`;
const safeName = (n: string) => n.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'fichier';
export const filePath = (id: string, name: string) => `files/${id}/${safeName(name)}`;

const parse = (bytes: Uint8Array): AnyDoc[] =>
  bytes.length ? (JSON.parse(dec.decode(bytes)) as AnyDoc[]) : [];
// Un document par ligne : l'historique git du dépôt reste lisible.
const serialize = (docs: AnyDoc[]) =>
  enc.encode(
    `[\n${[...docs]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((d) => JSON.stringify(d))
      .join(',\n')}\n]\n`,
  );

/**
 * Données dans un dépôt GitHub privé : un fichier JSON par collection (`data/<collection>.json`).
 * - Réception : lecture conditionnelle (ETag) ; rien n'est téléchargé si le fichier n'a pas bougé.
 * - Envoi : lire, fusionner (le plus récent gagne, par document), écrire avec le `sha` lu ;
 *   si quelqu'un a écrit entre-temps, GitHub refuse (conflit) et on recommence.
 */
export function githubRemote(api: GithubApi): Remote {
  return {
    async pull(collection, cursor) {
      const f = await api.getFile(collectionPath(collection), cursor);
      if (f === null) return { docs: [], cursor: null };
      if (f === 'unchanged') return { docs: [], cursor };
      return { docs: parse(f.bytes), cursor: f.etag };
    },

    async push(collection, docs) {
      if (docs.length === 0) return;
      const path = collectionPath(collection);
      for (let attempt = 0; attempt < 4; attempt++) {
        const current = await api.getFile(path);
        const existing = current && current !== 'unchanged' ? current : null;
        const byId = new Map((existing ? parse(existing.bytes) : []).map((d) => [d.id, d]));
        let changed = false;
        for (const d of docs) {
          const theirs = byId.get(d.id);
          if (!theirs || d.updatedAt > theirs.updatedAt) {
            byId.set(d.id, d);
            changed = true;
          }
        }
        if (!changed) return; // le dépôt a déjà ces versions ou de plus récentes
        try {
          await api.putFile(
            path,
            serialize([...byId.values()]),
            existing?.sha,
            `sync: ${collection} (${docs.length})`,
          );
          return;
        } catch (e) {
          if (!(e instanceof ConflictError)) throw e;
        }
      }
      throw new Error(`Conflit répété sur ${collection}`);
    },

    async uploadFile(id, name, blob) {
      const path = filePath(id, name);
      if (await api.getFile(path)) return; // déjà envoyé
      await api.putFile(
        path,
        new Uint8Array(await blob.arrayBuffer()),
        undefined,
        `fichier: ${safeName(name)}`,
      );
    },
  };
}
