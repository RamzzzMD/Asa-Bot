import { execSync } from 'node:child_process';
import fs from 'node:fs';

console.log('[Enami Asa Ai] Compiling TypeScript...');
execSync('npx tsc', { stdio: 'inherit' });
console.log('[Enami Asa Ai] Build completed successfully.');

const isPterodactyl = Boolean(
    process.env.P_SERVER_UUID ||
    process.env.P_SERVER_LOCATION ||
    process.env.SERVER_MEMORY ||
    process.env.CONTAINER_PORT ||
    (process.env.HOME && process.env.HOME.includes('/home/container')) ||
    process.argv.includes('index.js') ||
    process.argv.includes('--start')
);

if (isPterodactyl) {
    console.log('[Enami Asa Ai] Pterodactyl environment detected, launching bot...');
    await import('./dist/src/index.js');
}
