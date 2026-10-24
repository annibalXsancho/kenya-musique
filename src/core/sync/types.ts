import type { CollectionName } from '../model';

/** Document tel que stocké localement (champs communs inclus). */
export type AnyDoc = { id: string; updatedAt: string; deleted: boolean } & Record<string, unknown>;

/** Le réseau est injoignable ou temporairement refusé (hors ligne, limite GitHub). La file d'envoi est conservée. */
export class NetworkError extends Error {}
/** Le jeton d'accès n'est plus valide ou n'a pas les droits : il faut se reconnecter. */
export class AuthError extends Error {}

/** Ce que le moteur attend d'un serveur. Implémenté par GitHub ; simulé dans les tests. */
export interface Remote {
  /** Documents de la collection si elle a changé depuis `cursor` (jeton de version), sinon aucun. */
  pull(
    collection: CollectionName,
    cursor: string | null,
  ): Promise<{ docs: unknown[]; cursor: string | null }>;
  /** Création ou mise à jour par id, en une fois. Ne doit jamais écraser une version plus récente (updatedAt). */
  push(collection: CollectionName, docs: AnyDoc[]): Promise<void>;
  /** Envoi d'un fichier (idempotent : sans effet s'il existe déjà). */
  uploadFile(id: string, name: string, blob: Blob): Promise<void>;
}
