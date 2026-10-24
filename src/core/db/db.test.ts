import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { OutilDB, makeStore } from './index';
import { ID_RE } from '../model';
import { newId } from '../lib/ids';

let database: OutilDB;
let store: ReturnType<typeof makeStore>;

beforeEach(async () => {
  database = new OutilDB(`test-${newId()}`);
  store = makeStore(database);
});

const session = { date: '2026-10-24', dureeMin: 45, type: 'pratique' };

describe('ids', () => {
  it('génère des ids de 15 caractères [a-z0-9] distincts', () => {
    const ids = new Set(Array.from({ length: 500 }, newId));
    expect(ids.size).toBe(500);
    for (const id of ids) expect(id).toMatch(ID_RE);
  });
});

describe('écritures locales', () => {
  it('crée une session avec champs communs et une entrée outbox', async () => {
    const s = await store.create('sessions', session);
    expect(s.id).toMatch(ID_RE);
    expect(s.deleted).toBe(false);
    expect(s.conditionAtteinte).toBe(true);
    expect(await database.table('sessions').get(s.id)).toMatchObject({ dureeMin: 45 });
    expect(await database.outbox.toArray()).toMatchObject([
      { collection: 'sessions', recordId: s.id },
    ]);
  });

  it('modifie en gardant createdAt et en avançant updatedAt, sans doublon outbox', async () => {
    const s = await store.create('sessions', session);
    await new Promise((r) => setTimeout(r, 5));
    const u = await store.update('sessions', s.id, { dureeMin: 60, plus: ['clair'] });
    expect(u.createdAt).toBe(s.createdAt);
    expect(u.updatedAt > s.updatedAt).toBe(true);
    expect(u.dureeMin).toBe(60);
    expect(await database.outbox.count()).toBe(1);
  });

  it('supprime logiquement : l’enregistrement reste en base, marqué deleted', async () => {
    const s = await store.create('sessions', session);
    await store.remove('sessions', s.id);
    const row = await database.table('sessions').get(s.id);
    expect(row.deleted).toBe(true);
  });

  it('refuse les données invalides sans rien écrire', async () => {
    await expect(store.create('sessions', { ...session, dureeMin: 0 })).rejects.toThrow();
    expect(await database.table('sessions').count()).toBe(0);
    expect(await database.outbox.count()).toBe(0);
  });

  it('échoue proprement sur un id inconnu', async () => {
    await expect(store.update('sessions', 'inconnu0000000x', { dureeMin: 5 })).rejects.toThrow();
  });
});
