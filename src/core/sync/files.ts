import { db, notifyLocalWrite } from '../db';
import { newId } from '../lib/ids';
import { pb } from '../auth/client';

export const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Enregistre un fichier localement ; il part au serveur dès que le réseau le permet. */
export async function addFichier(file: File): Promise<{ id: string; name: string }> {
  if (file.size > MAX_FILE_BYTES) throw new Error('Fichier trop volumineux (50 Mo maximum).');
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

/** Adresse ouvrable d'un fichier : copie locale si on l'a, sinon téléchargement depuis le serveur. */
export async function fichierUrl(id: string): Promise<string> {
  const local = await db.blobs.get(id);
  if (local) return URL.createObjectURL(local.blob);
  try {
    const rec = await pb.collection('fichiers').getOne(id);
    const token = await pb.files.getToken();
    return pb.files.getURL(rec, rec.file as string, { token });
  } catch {
    throw new Error('Fichier indisponible (hors ligne ou introuvable).');
  }
}

/** Ouvre le fichier dans un nouvel onglet (fenêtre ouverte tout de suite pour ne pas être bloquée par Safari). */
export async function openFichier(id: string): Promise<void> {
  const w = window.open('', '_blank');
  try {
    const url = await fichierUrl(id);
    if (w) w.location.href = url;
    else window.location.href = url;
  } catch (e) {
    w?.close();
    throw e;
  }
}
