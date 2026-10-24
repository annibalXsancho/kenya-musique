import Dexie, { type Table } from 'dexie';
import { newId } from '../lib/ids';
import { nowISO } from '../lib/dates';
import { COLLECTIONS, schemas } from '../model';
import type { CollectionName, CreateInput, Doc } from '../model';

/** Entrée de la file d'envoi : « cet enregistrement doit être (ré)envoyé ». */
export interface OutboxEntry {
  seq?: number;
  collection: CollectionName;
  recordId: string;
  at: string;
}

/** Fichier de livrable conservé localement ; envoyé au serveur dès que le réseau le permet. */
export interface BlobEntry {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  status: 'pending' | 'done';
}

export interface MetaEntry {
  key: string;
  value: string;
}

export class OutilDB extends Dexie {
  outbox!: Table<OutboxEntry, number>;
  meta!: Table<MetaEntry, string>;
  blobs!: Table<BlobEntry, string>;

  constructor(name = 'outil') {
    super(name);
    this.version(1).stores({
      vision: 'id, updatedAt',
      objectifs: 'id, updatedAt, ordre',
      krs: 'id, updatedAt, objectifId',
      phases: 'id, updatedAt, ordre',
      sprints: 'id, updatedAt, phaseId, statut',
      etapes: 'id, updatedAt, sprintId',
      creneaux: 'id, updatedAt, debut, sprintId',
      sessions: 'id, updatedAt, date, sprintId, type',
      indisponibilites: 'id, updatedAt, debut',
      reglages: 'id, updatedAt',
      outbox: '++seq, [collection+recordId]',
    });
    // v2 (S3) : curseurs de synchro et fichiers en attente d'envoi.
    this.version(2).stores({ meta: 'key', blobs: 'id, status' });
  }
}

export const db = new OutilDB();

// Demande au navigateur de ne pas purger la base locale (utile sur iOS).
void navigator.storage?.persist?.();

// Notifie le moteur de synchro qu'une écriture locale vient d'avoir lieu (envoi après anti-rebond).
const writeListeners = new Set<() => void>();
export const notifyLocalWrite = () => writeListeners.forEach((cb) => cb());
export function onLocalWrite(cb: () => void): () => void {
  writeListeners.add(cb);
  return () => void writeListeners.delete(cb);
}

const tables = (database: OutilDB, c: CollectionName) => [database.table(c), database.outbox];

async function enqueue(database: OutilDB, collection: CollectionName, recordId: string) {
  const exists = await database.outbox
    .where('[collection+recordId]')
    .equals([collection, recordId])
    .count();
  if (exists === 0) await database.outbox.add({ collection, recordId, at: nowISO() });
}

/** Les écritures : transaction locale + entrée dans l'outbox (§8). Jamais de suppression définitive. */
export function makeStore(database: OutilDB) {
  async function create<C extends CollectionName>(
    c: C,
    data: CreateInput<C>,
    id = newId(),
  ): Promise<Doc<C>> {
    const ts = nowISO();
    const doc = (schemas[c] as unknown as { parse(v: unknown): Doc<C> }).parse({
      ...data,
      id,
      createdAt: ts,
      updatedAt: ts,
      deleted: false,
    });
    await database.transaction('rw', tables(database, c), async () => {
      await database.table(c).add(doc);
      await enqueue(database, c, id);
    });
    notifyLocalWrite();
    return doc;
  }

  async function update<C extends CollectionName>(
    c: C,
    id: string,
    patch: Partial<CreateInput<C>> & { deleted?: boolean },
  ): Promise<Doc<C>> {
    const doc = await database.transaction('rw', tables(database, c), async () => {
      const current = await database.table(c).get(id);
      if (!current) throw new Error(`${c}/${id} introuvable`);
      const doc = (schemas[c] as unknown as { parse(v: unknown): Doc<C> }).parse({
        ...current,
        ...patch,
        id,
        createdAt: current.createdAt,
        updatedAt: nowISO(),
      });
      await database.table(c).put(doc);
      await enqueue(database, c, id);
      return doc;
    });
    notifyLocalWrite();
    return doc;
  }

  const remove = <C extends CollectionName>(c: C, id: string) =>
    update(c, id, { deleted: true } as never);

  return { create, update, remove };
}

export const { create, update, remove } = makeStore(db);
export { COLLECTIONS };
