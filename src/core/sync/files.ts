import { db, notifyLocalWrite } from '../db';
import { newId } from '../lib/ids';
import { getConfig } from '../auth/client';
import { AuthError } from './types';
import { githubApi } from './github';
import { filePath } from './githubRemote';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

const api = githubApi(() => {
  const c = getConfig();
  if (!c) throw new AuthError('Non connecté.');
  return c;
});

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  txt: 'text/plain',
  json: 'application/json',
  zip: 'application/zip',
};

/** Enregistre un fichier localement ; il part vers le dépôt dès que le réseau le permet. */
export async function addFichier(file: File): Promise<{ id: string; name: string }> {
  if (file.size > MAX_FILE_BYTES) throw new Error('Fichier trop volumineux (25 Mo maximum).');
  const id = newId();
  await db.blobs.put({
    id,
    name: file.name,
    type: file.type,
    size: file.size,
    blob: file,
    status: 'pending',
  });
  notifyLocalWrite();
  return { id, name: file.name };
}

/** Adresse ouvrable d'un fichier : copie locale si on l'a, sinon téléchargement depuis le dépôt. */
export async function fichierUrl(id: string, name: string): Promise<string> {
  const local = await db.blobs.get(id);
  if (local) return URL.createObjectURL(local.blob);
  try {
    const f = await api.getFile(filePath(id, name));
    if (!f || f === 'unchanged') throw new Error('introuvable');
    const type = MIME[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';
    return URL.createObjectURL(new Blob([f.bytes as BlobPart], { type }));
  } catch (e) {
    throw new Error('Fichier indisponible (hors ligne ou introuvable).', { cause: e });
  }
}

/** Ouvre le fichier dans un nouvel onglet (fenêtre ouverte tout de suite pour ne pas être bloquée par Safari). */
export async function openFichier(id: string, name: string): Promise<void> {
  const w = window.open('', '_blank');
  try {
    const url = await fichierUrl(id, name);
    if (w) w.location.href = url;
    else window.location.href = url;
  } catch (e) {
    w?.close();
    throw e;
  }
}
