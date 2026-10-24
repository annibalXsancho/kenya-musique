import type { CollectionName } from '../model';
import { NetworkError } from './types';
import type { AnyDoc, Remote } from './types';

/** Serveur en mémoire pour les tests : curseur = numéro de version, refuse d'écraser plus récent. */
export class FakeRemote implements Remote {
  private seq = 0;
  private rows = new Map<string, { doc: AnyDoc; seq: number }>();
  files = new Map<string, Blob>();
  online = true;
  pushCalls = 0;
  onPush?: () => Promise<void> | void;

  private check() {
    if (!this.online) throw new NetworkError('hors ligne');
  }

  async pull(collection: CollectionName, cursor: string | null) {
    this.check();
    const since = cursor ? Number(cursor) : 0;
    const hits = [...this.rows.entries()].filter(
      ([k, r]) => k.startsWith(`${collection}/`) && r.seq >= since && r.seq > 0,
    );
    // « >= » comme le vrai serveur : le dernier enregistrement peut revenir en doublon.
    const docs = hits.sort((a, b) => a[1].seq - b[1].seq).map(([, r]) => structuredClone(r.doc));
    const last = hits.length ? String(Math.max(...hits.map(([, r]) => r.seq))) : cursor;
    return { docs, cursor: last };
  }

  async push(collection: CollectionName, docs: AnyDoc[]) {
    this.check();
    this.pushCalls++;
    await this.onPush?.();
    for (const doc of docs) {
      const key = `${collection}/${doc.id}`;
      const existing = this.rows.get(key);
      if (existing && existing.doc.updatedAt >= doc.updatedAt) continue;
      this.rows.set(key, { doc: structuredClone(doc), seq: ++this.seq });
    }
  }

  async uploadFile(id: string, _name: string, blob: Blob) {
    this.check();
    this.files.set(id, blob);
  }

  get(collection: CollectionName, id: string) {
    return this.rows.get(`${collection}/${id}`)?.doc;
  }
}
