import { ClientResponseError } from 'pocketbase';
import type PocketBase from 'pocketbase';
import type { CollectionName } from '../model';
import { AuthError, NetworkError } from './types';
import type { AnyDoc, Remote } from './types';

/** Traduit les erreurs du SDK : réseau coupé → NetworkError, session expirée → AuthError. */
function translate(e: unknown): never {
  if (e instanceof ClientResponseError) {
    if (e.status === 0) throw new NetworkError(e.message);
    if (e.status === 401) throw new AuthError(e.message);
  }
  throw e;
}

const notFound = (e: unknown) => e instanceof ClientResponseError && e.status === 404;

/** Serveur PocketBase : un enregistrement par document, le document complet dans `data`. */
export function pocketbaseRemote(pb: PocketBase): Remote {
  const ownerId = () => {
    const id = pb.authStore.record?.id;
    if (!id) throw new AuthError('non connecté');
    return id;
  };

  return {
    async pull(collection: CollectionName, cursor) {
      try {
        // Curseur = `updated` (horloge serveur, monotone) ; « >= » car plusieurs écritures peuvent partager la milliseconde.
        const filter = cursor ? pb.filter('updated >= {:c}', { c: cursor }) : '';
        const recs = await pb
          .collection(collection)
          .getFullList({ filter, sort: 'updated', batch: 200 });
        return {
          docs: recs.map((r) => r.data as unknown),
          cursor: recs.length ? (recs[recs.length - 1].updated as string) : cursor,
        };
      } catch (e) {
        translate(e);
      }
    },

    async push(collection: CollectionName, doc: AnyDoc) {
      const owner = ownerId();
      try {
        const col = pb.collection(collection);
        let existing: { updatedAt: string } | null = null;
        try {
          existing = await col.getOne<{ updatedAt: string }>(doc.id, { fields: 'id,updatedAt' });
        } catch (e) {
          if (!notFound(e)) throw e;
        }
        if (existing) {
          if (existing.updatedAt >= doc.updatedAt) return; // le serveur a déjà cette version ou une plus récente
          await col.update(doc.id, { updatedAt: doc.updatedAt, deleted: doc.deleted, data: doc });
        } else {
          await col.create({
            id: doc.id,
            owner,
            updatedAt: doc.updatedAt,
            deleted: doc.deleted,
            data: doc,
          });
        }
      } catch (e) {
        translate(e);
      }
    },

    async uploadFile(id, name, blob) {
      const owner = ownerId();
      try {
        try {
          await pb.collection('fichiers').getOne(id, { fields: 'id' });
          return; // déjà envoyé (envoi précédent interrompu avant l'accusé local)
        } catch (e) {
          if (!notFound(e)) throw e;
        }
        const form = new FormData();
        form.set('id', id);
        form.set('owner', owner);
        form.set('file', blob, name);
        await pb.collection('fichiers').create(form);
      } catch (e) {
        translate(e);
      }
    },
  };
}
