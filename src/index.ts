import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { EnamiAsaBot } from './core/connect.js';
import { config } from './lib/config.js';
import { logger } from './lib/logger.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const pluginsDir = path.join(currentDir, 'plugins');

const bot = new EnamiAsaBot(config, pluginsDir);

const shutdown = async (): Promise<void> => {
    try {
        await bot.stop();
        process.exit(0);
    } catch (error) {
        logger.error('Error saat proses mematikan bot', error);
        process.exit(1);
    }
};

process.on('SIGINT', () => {
    void shutdown();
});

process.on('SIGTERM', () => {
    void shutdown();
});

bot.start().catch((error) => {
    logger.error('Gagal menjalankan bot', error);
    process.exit(1);
});
