import { COLLECTIONS } from '../model';
import { nowISO } from '../lib/dates';
import { db } from './index';
import type { OutilDB } from './index';

/** Export complet (« Exporter tout ») : toutes les collections, suppressions logiques comprises. */
export async function exportAll(database: OutilDB = db) {
  const collections: Record<string, unknown[]> = {};
  for (const c of COLLECTIONS) collections[c] = await database.table(c).toArray();
  const fichiers = (await database.blobs.toArray()).map(({ id, name, type, size, status }) => ({
    id,
    name,
    type,
    size,
    status,
  }));
  return { app: 'outil', version: 1, exportedAt: nowISO(), collections, fichiersLocaux: fichiers };
}

export async function downloadExport(): Promise<void> {
  const data = await exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `outil-export-${data.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
