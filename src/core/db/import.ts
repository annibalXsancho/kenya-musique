import { COLLECTIONS, schemas } from '../model';
import type { CollectionName } from '../model';
import { create, update } from './index';
import { db } from './index';

/** Collections « à un seul document » : on met à jour l'existant au lieu d'en ajouter un second. */
const SINGLETONS: CollectionName[] = ['vision', 'reglages'];
/** Ordre d'écriture : les parents avant les enfants. */
const ORDER: CollectionName[] = [
  'vision',
  'reglages',
  'phases',
  'objectifs',
  'krs',
  'sprints',
  'etapes',
  'creneaux',
  'sessions',
  'indisponibilites',
];

export interface ImportReport {
  added: Partial<Record<CollectionName, number>>;
  skipped: number;
}

/**
 * Importe un fichier `{ app: 'outil', collections: { nom: [doc…] } }` (export de l'app ou conversion de « Pilotage musique »).
 * Idempotent : un document dont l'id existe déjà n'est jamais réécrit. Tout est validé avant la première écriture.
 */
export async function importData(file: unknown): Promise<ImportReport> {
  const cols = (file as { collections?: Record<string, unknown[]> } | null)?.collections;
  if (!cols || typeof cols !== 'object') throw new Error('Fichier non reconnu.');

  type Row = Record<string, unknown> & { id: string };
  const plan: { c: CollectionName; doc: Row }[] = [];
  for (const c of ORDER.filter((x) => x in cols)) {
    if (!COLLECTIONS.includes(c)) continue;
    for (const raw of cols[c]) {
      const now = new Date().toISOString();
      const probe = { createdAt: now, updatedAt: now, deleted: false, ...(raw as object) };
      const parsed = (
        schemas[c] as unknown as { safeParse(v: unknown): { success: boolean } }
      ).safeParse(probe);
      if (!parsed.success) throw new Error(`Document invalide dans « ${c} » (${(raw as Row).id}).`);
      plan.push({ c, doc: raw as Row });
    }
  }

  const report: ImportReport = { added: {}, skipped: 0 };
  for (const { c, doc } of plan) {
    const { id } = doc;
    const data: Record<string, unknown> = { ...doc };
    for (const k of ['id', 'createdAt', 'updatedAt', 'deleted']) delete data[k];
    if (await db.table(c).get(id)) {
      report.skipped++;
      continue;
    }
    if (SINGLETONS.includes(c)) {
      const existing = (await db.table(c).toArray()).find((d) => !d.deleted);
      if (existing) {
        await update(c, existing.id, data as never);
        report.added[c] = (report.added[c] ?? 0) + 1;
        continue;
      }
    }
    await create(c, data as never, id);
    report.added[c] = (report.added[c] ?? 0) + 1;
  }
  return report;
}
