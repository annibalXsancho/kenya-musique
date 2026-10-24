const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Identifiant de 15 caractères [a-z0-9], généré côté client. */
export function newId(): string {
  let out = '';
  while (out.length < 15) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    for (const b of bytes) {
      if (b < 252 && out.length < 15) out += ALPHABET[b % 36]; // 252 = 7 × 36 : pas de biais
    }
  }
  return out;
}
