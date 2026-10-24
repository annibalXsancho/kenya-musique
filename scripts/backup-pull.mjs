// Copie hors serveur : télécharge les sauvegardes PocketBase sur CE Mac.
// Usage : PB_URL=https://outil.<tailnet>.ts.net PB_SUPERUSER_EMAIL=… PB_SUPERUSER_PASSWORD=… node scripts/backup-pull.mjs
// Options : BACKUP_DIR (défaut ~/Backups/outil), KEEP (défaut 30 copies locales).
import { mkdirSync, existsSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const { PB_URL, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD } = process.env;
const dir = process.env.BACKUP_DIR ?? join(homedir(), 'Backups', 'outil');
const keep = Number(process.env.KEEP ?? 30);

if (!PB_URL || !PB_SUPERUSER_EMAIL || !PB_SUPERUSER_PASSWORD) {
  console.error('Variables requises : PB_URL, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD');
  process.exit(1);
}

async function api(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(PB_URL + path, {
    method,
    headers: {
      ...(token ? { Authorization: token } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res;
}

const { token } = await (
  await api('/api/collections/_superusers/auth-with-password', {
    method: 'POST',
    body: { identity: PB_SUPERUSER_EMAIL, password: PB_SUPERUSER_PASSWORD },
  })
).json();

// Sauvegarde fraîche, puis téléchargement de tout ce qui manque localement.
await api('/api/backups', { token, method: 'POST', body: { name: '' } });
const list = await (await api('/api/backups', { token })).json();
const { token: fileToken } = await (
  await api('/api/files/token', { token, method: 'POST' })
).json();

mkdirSync(dir, { recursive: true });
let downloaded = 0;
for (const b of list) {
  const target = join(dir, b.key);
  if (existsSync(target) && statSync(target).size === b.size) continue;
  const res = await api(`/api/backups/${encodeURIComponent(b.key)}?token=${fileToken}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length !== b.size) throw new Error(`Taille inattendue pour ${b.key}`);
  writeFileSync(target, buf);
  downloaded++;
}

// Ne garde que les `keep` plus récentes.
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.zip'))
  .sort();
for (const f of files.slice(0, Math.max(0, files.length - keep))) rmSync(join(dir, f));

console.log(
  `${downloaded} sauvegarde(s) téléchargée(s) dans ${dir} (${Math.min(files.length, keep)} conservées).`,
);
