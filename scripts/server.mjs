import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../server/pocketbase', import.meta.url));
if (!existsSync(bin)) {
  console.error('Binaire PocketBase absent : voir server/VERSION et CLAUDE.md §5.');
  process.exit(1);
}
const child = spawn(bin, ['serve', '--http=0.0.0.0:8090'], {
  cwd: fileURLToPath(new URL('../server/', import.meta.url)),
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
