import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OutilDB, makeStore } from '../db';
import { newId } from '../lib/ids';
import { createEngine } from './engine';
import { githubApi } from './github';
import { githubRemote } from './githubRemote';
import { createFakeGithub } from './fakeGithub';
import { AuthError, NetworkError } from './types';

type Fake = ReturnType<typeof createFakeGithub>;

function device(gh: Fake, token = gh.token) {
  const db = new OutilDB(`gh-${newId()}`);
  const api = githubApi(
    () => ({ repo: gh.repo, token, apiBase: 'https://api.github.com' }),
    gh.fetch,
  );
  const remote = githubRemote(api);
  return { db, api, remote, store: makeStore(db), engine: createEngine(db, remote) };
}
const at = (iso: string) => vi.setSystemTime(new Date(iso));
const base = { date: '2026-10-24', dureeMin: 30, type: 'pratique' };
const intentions = async (d: ReturnType<typeof device>) =>
  (await d.db.table('sessions').toArray())
    .filter((x) => !x.deleted)
    .map((x) => x.intention)
    .sort();

let gh: Fake;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  at('2026-10-24T10:00:00Z');
  gh = createFakeGithub();
});
afterEach(() => vi.useRealTimers());

describe('synchro via un dépôt GitHub', () => {
  it('deux appareils convergent ; une seule écriture par collection', async () => {
    const a = device(gh);
    const b = device(gh);
    await a.store.create('sessions', { ...base, intention: 'A1' });
    await a.store.create('sessions', { ...base, intention: 'A2' });
    await b.store.create('sessions', { ...base, intention: 'B1' });
    await a.engine.sync();
    expect(gh.stats.puts).toBe(1); // 2 documents, 1 commit
    await b.engine.sync();
    await a.engine.sync();
    expect(await intentions(a)).toEqual(['A1', 'A2', 'B1']);
    expect(await intentions(b)).toEqual(['A1', 'A2', 'B1']);
    expect(gh.read('data/sessions.json')!.trim().split('\n')).toHaveLength(5); // [ + 3 docs + ]
  });

  it('le plus récent gagne ; la suppression se propage', async () => {
    const a = device(gh);
    const b = device(gh);
    const s = await a.store.create('sessions', { ...base, intention: 'v0' });
    await a.engine.sync();
    await b.engine.sync();
    at('2026-10-24T11:00:00Z');
    await a.store.update('sessions', s.id, { intention: 'ancien' });
    at('2026-10-24T12:00:00Z');
    await b.store.update('sessions', s.id, { intention: 'récent' });
    await b.engine.sync();
    await a.engine.sync(); // A reçoit « récent » et ne l'écrase pas avec « ancien »
    expect(await intentions(a)).toEqual(['récent']);
    at('2026-10-24T13:00:00Z');
    await a.store.remove('sessions', s.id);
    await a.engine.sync();
    await b.engine.sync();
    expect(await intentions(b)).toEqual([]);
    expect((await b.db.table('sessions').get(s.id)).deleted).toBe(true);
  });

  it('rien n’est retéléchargé quand le fichier n’a pas changé (304)', async () => {
    const a = device(gh);
    await a.store.create('sessions', { ...base, intention: 'x' });
    await a.engine.sync();
    await a.engine.sync();
    const before = gh.stats.notModified;
    await a.engine.sync();
    expect(gh.stats.notModified).toBeGreaterThan(before);
  });

  it('écriture concurrente d’un autre appareil → conflit détecté, fusion et nouvel essai', async () => {
    const a = device(gh);
    const b = device(gh);
    await a.store.create('sessions', { ...base, intention: 'de A' });
    await b.store.create('sessions', { ...base, intention: 'de B' });
    let injected = false;
    gh.hooks.beforePut = async () => {
      if (injected) return;
      injected = true;
      await b.engine.sync(); // B écrit juste avant A, entre sa lecture et son écriture
    };
    await a.engine.sync();
    gh.hooks.beforePut = undefined;
    expect(gh.read('data/sessions.json')).toContain('de A'); // la version de B n'a pas été écrasée
    expect(gh.read('data/sessions.json')).toContain('de B');
    await b.engine.sync();
    await a.engine.sync();
    expect(await intentions(a)).toEqual(['de A', 'de B']);
    expect(await intentions(b)).toEqual(['de A', 'de B']);
  });

  it('hors ligne → NetworkError et file conservée', async () => {
    const a = device(gh);
    await a.store.create('sessions', { ...base, intention: 'x' });
    gh.hooks.online = false;
    await expect(a.engine.sync()).rejects.toBeInstanceOf(NetworkError);
    expect(await a.db.outbox.count()).toBe(1);
    gh.hooks.online = true;
    await a.engine.sync();
    expect(await a.db.outbox.count()).toBe(0);
  });

  it('mauvais jeton → AuthError', async () => {
    const a = device(gh, 'mauvais');
    await expect(a.engine.sync()).rejects.toBeInstanceOf(AuthError);
  });

  it('fichiers : envoyés une fois, relisibles depuis un autre appareil', async () => {
    const a = device(gh);
    const b = device(gh);
    await a.db.blobs.put({
      id: 'fichier00000001',
      name: 'mix final.wav',
      type: 'audio/wav',
      size: 4,
      blob: new Blob(['abcd']),
      status: 'pending',
    });
    await a.engine.sync();
    await a.db.blobs.update('fichier00000001', { status: 'pending' }); // accusé local perdu
    const puts = gh.stats.puts;
    await a.engine.sync();
    expect(gh.stats.puts).toBe(puts); // idempotent : pas de second envoi
    const read = await b.api.getFile('files/fichier00000001/mix final.wav');
    expect(read && read !== 'unchanged' && new TextDecoder().decode(read.bytes)).toBe('abcd');
  });

  it('gros fichier de données (> 1 Mo) relu en brut', async () => {
    const a = device(gh);
    const b = device(gh);
    for (let i = 0; i < 40; i++)
      await a.store.create('sessions', { ...base, intention: `s${i}`, note: 'x'.repeat(30_000) });
    await a.engine.sync();
    expect(gh.files.get('data/sessions.json')!.bytes.length).toBeGreaterThan(1_000_000);
    await b.engine.sync();
    expect((await b.db.table('sessions').toArray()).length).toBe(40);
  });
});
