import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['listplugin', 'listplugins', 'lp'],
    category: 'owner',
    description: 'Melihat seluruh daftar file plugin yang terpasang di bot',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const baseDir = path.resolve('src/plugins');
        if (!fs.existsSync(baseDir)) {
            await context.reply('❌ Folder plugins tidak ditemukan.');
            return;
        }

        try {
            const categories = fs.readdirSync(baseDir).filter((f) =>
                fs.statSync(path.join(baseDir, f)).isDirectory()
            );

            let totalFiles = 0;
            let body = '';

            for (const cat of categories) {
                const files = fs.readdirSync(path.join(baseDir, cat)).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));
                if (files.length === 0) continue;
                totalFiles += files.length;
                body += `\n┌ *${cat.toUpperCase()}* (${files.length})\n`;
                body += files.map((f) => `│ • ${f}`).join('\n');
                body += '\n└─────\n';
            }

            const header =
                `📦 *Daftar Plugin ${context.config.botName}*\n` +
                `• Total File: *${totalFiles}*\n` +
                `• Kategori: *${categories.length}*\n\n` +
                `*Perintah Manajemen:*\n` +
                `› *${context.usedPrefix}getplugin <kategori/file.ts>*\n` +
                `› *${context.usedPrefix}addplugin <kategori/file.ts> (reply kode)*\n` +
                `› *${context.usedPrefix}delplugin <kategori/file.ts>*\n`;

            await context.reply(header + body);
        } catch (err: any) {
            console.error(err);
            await context.reply(`❌ Terjadi kesalahan: ${err.message}`);
        }
    }
};

export default handler;
