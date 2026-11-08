import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['delscrape', 'delscraper', 'ds'],
    category: 'owner',
    description: 'Menghapus file scraper dari folder scrape/',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const input = context.text.trim();
        if (!input) {
            await context.reply(`Contoh: *${context.usedPrefix}${context.command} tiktok.ts*`);
            return;
        }

        const scrapeBaseDir = path.resolve('scrape');
        const normalizedFile = input.endsWith('.ts') || input.endsWith('.js') ? input : `${input}.ts`;
        const targetPath = path.resolve(scrapeBaseDir, normalizedFile);

        if (!targetPath.startsWith(scrapeBaseDir)) {
            await context.reply('❌ Path tidak valid.');
            return;
        }

        if (!fs.existsSync(targetPath)) {
            await context.reply(`❌ File scrape *${normalizedFile}* tidak ditemukan.`);
            return;
        }

        try {
            fs.unlinkSync(targetPath);

            // Hapus juga file hasil kompilasi di dist/scrape jika ada
            const baseName = path.basename(targetPath, path.extname(targetPath));
            const distScrapePath = path.resolve('dist', 'scrape', `${baseName}.js`);
            if (fs.existsSync(distScrapePath)) {
                try {
                    fs.unlinkSync(distScrapePath);
                } catch {}
            }

            await context.reply(`🗑️ Scraper *scrape/${path.basename(targetPath)}* berhasil dihapus.`);
        } catch (err: any) {
            await context.reply(`❌ Gagal menghapus scrape: ${err.message}`);
        }
    }
};

export default handler;

