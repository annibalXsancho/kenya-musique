// Test d'intégration contre un vrai PocketBase (migrations appliquées, un compte existant).
// Lancer : PB_URL=http://127.0.0.1:8191 PB_EMAIL=… PB_PASSWORD=… npm test
import 'fake-indexeddb/auto';
import PocketBase from 'pocketbase';
import { describe, expect, it } from 'vitest';
import { OutilDB, makeStore } from '../db';
import { newId } from '../lib/ids';
import { createEngine } from './engine';
import { pocketbaseRemote } from './pocketbaseRemote';

const { PB_URL, PB_EMAIL, PB_PASSWORD } = process.env;

async function device() {
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  await pb.collection('users').authWithPassword(PB_EMAIL!, PB_PASSWORD!);
  const db = new OutilDB(`it-${newId()}`);
  return { pb, db, store: makeStore(db), engine: createEngine(db, pocketbaseRemote(pb)) };
}

describe.skipIf(!PB_URL)('synchro contre PocketBase', () => {
  it('deux appareils convergent, le plus récent gagne, la suppression et les fichiers passent', async () => {
    const a = await device();
    const b = await device();
    const base = { date: '2026-10-24', dureeMin: 30, type: 'pratique' };
    const tag = newId();

    const s = await a.store.create('sessions', { ...base, intention: `${tag} A` });
    await b.store.create('sessions', { ...base, intention: `${tag} B` });
    await a.engine.sync();
    await b.engine.sync();
    await a.engine.sync();
    const mine = async (d: typeof a) =>
      (await d.db.table('sessions').toArray())
        .filter((x) => x.intention.startsWith(tag))
        .map((x) => x.intention)
        .sort();
    expect(await mine(a)).toEqual([`${tag} A`, `${tag} B`]);
    expect(await mine(b)).toEqual([`${tag} A`, `${tag} B`]);

    // conflit : B modifie après A → B gagne
    await a.store.update('sessions', s.id, { intention: `${tag} v-A` });
    await new Promise((r) => setTimeout(r, 20));
    await b.store.update('sessions', s.id, { intention: `${tag} v-B` });
    await a.engine.sync();
    await b.engine.sync();
    await a.engine.sync();
    expect((await a.db.table('sessions').get(s.id)).intention).toBe(`${tag} v-B`);
    expect((await b.db.table('sessions').get(s.id)).intention).toBe(`${tag} v-B`);

    // suppression propagée
    await new Promise((r) => setTimeout(r, 20));
    await a.store.remove('sessions', s.id);
    await a.engine.sync();
    await b.engine.sync();
    expect((await b.db.table('sessions').get(s.id)).deleted).toBe(true);

    // fichier : envoi idempotent, relisible depuis l'autre appareil
    const fid = newId();
    await a.db.blobs.put({
      id: fid,
      name: 'note.txt',
      type: 'text/plain',
      size: 5,
      blob: new Blob(['salut']),
      status: 'pending',
    });
    await a.engine.sync();
    await a.db.blobs.update(fid, { status: 'pending' }); // simule un accusé local perdu
    await a.engine.sync();
    const rec = await b.pb.collection('fichiers').getOne(fid);
    const url = b.pb.files.getURL(rec, rec.file as string, { token: await b.pb.files.getToken() });
    expect(await (await fetch(url)).text()).toBe('salut');
    expect((await a.db.blobs.get(fid))?.status).toBe('done');
  }, 30000);
});
