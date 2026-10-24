import { COLLECTIONS, schemas } from '../model';
import type { CollectionName } from '../model';
import type { OutilDB } from '../db';
import { AuthError, NetworkError } from './types';
import type { AnyDoc, Remote } from './types';

export interface SyncReport {
  pushed: number;
  pulled: number;
  uploaded: number;
  /** Erreurs non réseau (donnée refusée par le serveur…) : l'entrée reste dans la file. */
  errors: number;
}

/**
 * Moteur de synchro (CLAUDE.md §8). La base locale reste la source de l'interface :
 * 1. réception (le plus récent gagne, par enregistrement), 2. envoi de l'outbox, 3. fichiers.
 * Lève NetworkError / AuthError si le serveur est injoignable ou la session expirée.
 */
export function createEngine(db: OutilDB, remote: Remote) {
  let running: Promise<SyncReport> | null = null;
  let again = false;

  async function pull(): Promise<{ pulled: number; errors: number }> {
    let pulled = 0;
    let errors = 0;
    for (const c of COLLECTIONS) {
      const key = `cursor:${c}`;
      const cursor = (await db.meta.get(key))?.value ?? null;
      const res = await remote.pull(c, cursor);
      const parser = schemas[c] as unknown as {
        safeParse(v: unknown): { success: boolean; data?: AnyDoc };
      };
      await db.transaction('rw', db.table(c), async () => {
        for (const raw of res.docs) {
          const parsed = parser.safeParse(raw);
          if (!parsed.success || !parsed.data) {
            errors++;
            continue;
          }
          const remoteDoc = parsed.data;
          const local = (await db.table(c).get(remoteDoc.id)) as AnyDoc | undefined;
          if (!local || remoteDoc.updatedAt > local.updatedAt) {
            await db.table(c).put(remoteDoc);
            pulled++;
          }
        }
      });
      if (res.cursor && res.cursor !== cursor) await db.meta.put({ key, value: res.cursor });
    }
    return { pulled, errors };
  }

  async function push(): Promise<{ pushed: number; errors: number }> {
    let pushed = 0;
    let errors = 0;
    for (const entry of await db.outbox.orderBy('seq').toArray()) {
      const doc = (await db.table(entry.collection).get(entry.recordId)) as AnyDoc | undefined;
      if (!doc) {
        await db.outbox.delete(entry.seq!);
        continue;
      }
      try {
        await remote.push(entry.collection, doc);
      } catch (e) {
        if (e instanceof NetworkError || e instanceof AuthError) throw e;
        errors++;
        continue;
      }
      // Retire l'entrée seulement si l'enregistrement n'a pas été modifié pendant l'envoi.
      await db.transaction('rw', db.table(entry.collection), db.outbox, async () => {
        const now = (await db.table(entry.collection).get(entry.recordId)) as AnyDoc | undefined;
        if (!now || now.updatedAt === doc.updatedAt) await db.outbox.delete(entry.seq!);
      });
      pushed++;
    }
    return { pushed, errors };
  }

  async function uploadFiles(): Promise<{ uploaded: number; errors: number }> {
    let uploaded = 0;
    let errors = 0;
    for (const b of await db.blobs.where('status').equals('pending').toArray()) {
      try {
        await remote.uploadFile(b.id, b.name, b.blob);
        await db.blobs.update(b.id, { status: 'done' });
        uploaded++;
      } catch (e) {
        if (e instanceof NetworkError || e instanceof AuthError) throw e;
        errors++;
      }
    }
    return { uploaded, errors };
  }

  async function run(): Promise<SyncReport> {
    const a = await pull();
    const b = await push();
    const c = await uploadFiles();
    return {
      pulled: a.pulled,
      pushed: b.pushed,
      uploaded: c.uploaded,
      errors: a.errors + b.errors + c.errors,
    };
  }

  /** Une seule synchro à la fois ; une demande arrivée pendant l'exécution en déclenche une seconde. */
  function sync(): Promise<SyncReport> {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      try {
        let report = await run();
        while (again) {
          again = false;
          const next = await run();
          report = {
            pulled: report.pulled + next.pulled,
            pushed: report.pushed + next.pushed,
            uploaded: report.uploaded + next.uploaded,
            errors: next.errors,
          };
        }
        return report;
      } finally {
        running = null;
        again = false;
      }
    })();
    return running;
  }

  return { sync };
}

export type { CollectionName };
