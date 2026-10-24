import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './index';
import { DEFAULT_REGLAGES } from '../model';
import type { CollectionName, Doc, Reglages } from '../model';

/** Lecture réactive : enregistrements non supprimés. `undefined` pendant le chargement. */
export function useList<C extends CollectionName>(c: C): Doc<C>[] | undefined {
  return useLiveQuery(
    async () => (await db.table(c).toArray()).filter((d) => !d.deleted) as Doc<C>[],
    [c],
  );
}

export function useReglages(): Pick<Reglages, keyof typeof DEFAULT_REGLAGES> {
  const stored = useLiveQuery(
    async () => (await db.table('reglages').toArray())[0] as Reglages | undefined,
    [],
  );
  return { ...DEFAULT_REGLAGES, ...stored };
}
