import { execSync } from 'node:child_process';

console.log('[Enami Asa Ai] Compiling TypeScript...');
execSync('npx tsc', { stdio: 'inherit' });
console.log('[Enami Asa Ai] Build completed successfully. Starting Enami Asa Ai...');

await import('./dist/src/index.js');
