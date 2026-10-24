// Lance le front (Vite) et PocketBase ensemble ; Ctrl+C arrête les deux.
import { spawn } from 'node:child_process';

const run = (script) => spawn('npm', ['run', script], { stdio: 'inherit' });
const procs = [run('dev:web'), run('dev:server')];
const stop = () => procs.forEach((p) => p.kill('SIGINT'));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
procs.forEach((p) => p.on('exit', stop));
