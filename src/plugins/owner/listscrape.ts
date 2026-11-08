import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['listscrape', 'listscraper', 'ls'],
    category: 'owner',
    description: 'Melihat seluruh daftar file scraper yang tersimpan di folder scrape/',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const scrapeDir = path.resolve('scrape');
        if (!fs.existsSync(scrapeDir)) {
            await context.reply('❌ Folder `scrape/` tidak ditemukan.');
            return;
        }

        try {
            const files = fs
                .readdirSync(scrapeDir)
                .filter((f) => f.endsWith('.ts') || f.endsWith('.js'))
                .sort((a, b) => a.localeCompare(b));

            if (files.length === 0) {
                await context.reply('📂 Folder `scrape/` masih kosong.');
                return;
            }

            const lines = files.map((file, idx) => {
                const fullPath = path.join(scrapeDir, file);
                const stat = fs.statSync(fullPath);
                const sizeKb = (stat.size / 1024).toFixed(1);
                return `│ ${idx + 1}. \`${file}\` (${sizeKb} KB)`;
            });

            const message =
                `🕷️ *DAFTAR SCRAPER ${context.config.botName.toUpperCase()}*\n` +
                `• *Total File:* ${files.length} Scraper\n` +
                `• *Owner:* ${context.config.ownerName}\n\n` +
                `╭──「 📂 *FOLDER SCRAPE/* 」\n` +
                `${lines.join('\n')}\n` +
                `╰───────────────\n\n` +
                `*Perintah Manajemen Scrape:*\n` +
                `› *${context.usedPrefix}scrape* (kirim/reply kode scrape)\n` +
                `› *${context.usedPrefix}getscrape <nama.ts>*\n` +
                `› *${context.usedPrefix}delscrape <nama.ts>*`;

            await context.reply(message);
        } catch (err: any) {
            await context.reply(`❌ Gagal membaca daftar scrape: ${err.message}`);
        }
    }
};

export default handler;

