import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OutilDB, makeStore } from '../db';
import { newId } from '../lib/ids';
import { createEngine } from './engine';
import { FakeRemote } from './fakeRemote';

function device(remote: FakeRemote) {
  const db = new OutilDB(`dev-${newId()}`);
  return { db, store: makeStore(db), engine: createEngine(db, remote) };
}
const at = (iso: string) => vi.setSystemTime(new Date(iso));
const base = { date: '2026-10-24', dureeMin: 30, type: 'pratique' };
const rows = async (d: ReturnType<typeof device>) =>
  (await d.db.table('sessions').toArray())
    .map((x) => [x.id, x.intention, x.dureeMin, x.deleted])
    .sort();

let remote: FakeRemote;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  at('2026-10-24T10:00:00Z');
  remote = new FakeRemote();
});
afterEach(() => vi.useRealTimers());

describe('synchronisation', () => {
  it('écritures hors ligne sur 2 appareils → convergence', async () => {
    const a = device(remote);
    const b = device(remote);
    remote.online = false;
    await a.store.create('sessions', { ...base, intention: 'A1' });
    at('2026-10-24T10:01:00Z');
    await b.store.create('sessions', { ...base, intention: 'B1' });
    await expect(a.engine.sync()).rejects.toThrow();
    expect(await a.db.outbox.count()).toBe(1); // rien n'est perdu hors ligne

    remote.online = true;
    await a.engine.sync();
    await b.engine.sync();
    await a.engine.sync();

    expect(await rows(a)).toEqual(await rows(b));
    expect(await a.db.table('sessions').count()).toBe(2);
    expect(await a.db.outbox.count()).toBe(0);
    expect(await b.db.outbox.count()).toBe(0);
  });

  it('conflit sur le même enregistrement → le plus récent gagne, quel que soit l’ordre de synchro', async () => {
    const a = device(remote);
    const b = device(remote);
    const s = await a.store.create('sessions', { ...base, intention: 'v0' });
    await a.engine.sync();
    await b.engine.sync();

    remote.online = false;
    at('2026-10-24T11:00:00Z');
    await a.store.update('sessions', s.id, { intention: 'depuis A', dureeMin: 10 });
    at('2026-10-24T12:00:00Z');
    await b.store.update('sessions', s.id, { intention: 'depuis B', dureeMin: 20 }); // plus récent

    remote.online = true;
    await b.engine.sync(); // B envoie d'abord
    await a.engine.sync(); // A reçoit B (plus récent) et ne l'écrase pas
    await b.engine.sync();
    await a.engine.sync();

    for (const d of [a, b]) expect(await rows(d)).toEqual([[s.id, 'depuis B', 20, false]]);
    expect(remote.get('sessions', s.id)?.intention).toBe('depuis B');
  });

  it('conflit : une modification locale plus récente n’est pas écrasée par le serveur', async () => {
    const a = device(remote);
    const b = device(remote);
    const s = await a.store.create('sessions', { ...base, intention: 'v0' });
    await a.engine.sync();
    await b.engine.sync();
    at('2026-10-24T11:00:00Z');
    await a.store.update('sessions', s.id, { intention: 'ancien' });
    await a.engine.sync();
    at('2026-10-24T12:00:00Z');
    await b.store.update('sessions', s.id, { intention: 'récent' });
    await b.engine.sync(); // pull (reçoit « ancien », plus vieux → ignoré) puis push
    expect((await b.db.table('sessions').get(s.id)).intention).toBe('récent');
    await a.engine.sync();
    expect((await a.db.table('sessions').get(s.id)).intention).toBe('récent');
  });

  it('suppression propagée', async () => {
    const a = device(remote);
    const b = device(remote);
    const s = await a.store.create('sessions', { ...base, intention: 'à supprimer' });
    await a.engine.sync();
    await b.engine.sync();
    expect(await b.db.table('sessions').count()).toBe(1);

    at('2026-10-24T11:00:00Z');
    await a.store.remove('sessions', s.id);
    await a.engine.sync();
    await b.engine.sync();
    expect((await b.db.table('sessions').get(s.id)).deleted).toBe(true);
  });

  it('une modification faite pendant l’envoi garde son entrée dans l’outbox', async () => {
    const a = device(remote);
    const s = await a.store.create('sessions', { ...base, intention: 'v0' });
    remote.onPush = async () => {
      remote.onPush = undefined;
      at('2026-10-24T10:30:00Z');
      await a.store.update('sessions', s.id, { intention: 'modifiée pendant l’envoi' });
    };
    await a.engine.sync();
    // la boucle « again » n'est pas déclenchée ici : l'entrée doit simplement rester
    expect(await a.db.outbox.count()).toBe(1);
    await a.engine.sync();
    expect(await a.db.outbox.count()).toBe(0);
    expect(remote.get('sessions', s.id)?.intention).toBe('modifiée pendant l’envoi');
  });

  it('ignore un document distant invalide sans bloquer le reste', async () => {
    const a = device(remote);
    await remote.push('sessions', [
      {
        id: 'zzzzzzzzzzzzzzz',
        updatedAt: '2026-10-24T10:00:00.000Z',
        deleted: false,
        dureeMin: -4,
      },
    ]);
    await remote.push('sessions', [
      {
        id: 'yyyyyyyyyyyyyyy',
        createdAt: '2026-10-24T10:00:00.000Z',
        updatedAt: '2026-10-24T10:00:00.000Z',
        deleted: false,
        date: '2026-10-24',
        dureeMin: 5,
        type: 'pratique',
      },
    ]);
    const report = await a.engine.sync();
    expect(report.errors).toBe(1);
    expect(await a.db.table('sessions').count()).toBe(1);
  });

  it('envoie les fichiers en attente au retour du réseau', async () => {
    const a = device(remote);
    await a.db.blobs.put({
      id: 'fichier00000001',
      name: 'mix.wav',
      type: 'audio/wav',
      size: 3,
      blob: new Blob(['abc']),
      status: 'pending',
    });
    remote.online = false;
    await expect(a.engine.sync()).rejects.toThrow();
    expect((await a.db.blobs.get('fichier00000001'))?.status).toBe('pending');
    remote.online = true;
    const r = await a.engine.sync();
    expect(r.uploaded).toBe(1);
    expect(remote.files.has('fichier00000001')).toBe(true);
    expect((await a.db.blobs.get('fichier00000001'))?.status).toBe('done');
  });

  it('une seule synchro à la fois', async () => {
    const a = device(remote);
    await a.store.create('sessions', { ...base, intention: 'x' });
    const [r1, r2] = await Promise.all([a.engine.sync(), a.engine.sync()]);
    expect(r1).toEqual(r2);
    expect(remote.pushCalls).toBe(1);
  });
});
