import type { CollectionName } from '../model';

/** Document tel que stocké localement (champs communs inclus). */
export type AnyDoc = { id: string; updatedAt: string; deleted: boolean } & Record<string, unknown>;

/** Le réseau est injoignable (hors ligne, serveur éteint). La file d'envoi est conservée. */
export class NetworkError extends Error {}
/** La session de connexion n'est plus valide : il faut se reconnecter. */
export class AuthError extends Error {}

/** Ce que le moteur attend d'un serveur. Implémenté par PocketBase ; simulé dans les tests. */
export interface Remote {
  /** Documents modifiés depuis `cursor` (curseur serveur). Peut renvoyer des doublons. */
  pull(
    collection: CollectionName,
    cursor: string | null,
  ): Promise<{ docs: unknown[]; cursor: string | null }>;
  /** Création ou mise à jour par id. Ne doit jamais écraser une version plus récente (updatedAt). */
  push(collection: CollectionName, doc: AnyDoc): Promise<void>;
  /** Envoi d'un fichier (idempotent : sans effet s'il existe déjà). */
  uploadFile(id: string, name: string, blob: Blob): Promise<void>;
}
