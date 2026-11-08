import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['getscrape', 'getscraper', 'gs'],
    category: 'owner',
    description: 'Mengambil dan menampilkan kode sumber file dari folder scrape/',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const input = context.text.trim();
        if (!input) {
            await context.reply(
                `*Cara Penggunaan:*\n` +
                `› *${context.usedPrefix}${context.command} deepchat*\n` +
                `› *${context.usedPrefix}${context.command} ytmusic.ts*\n\n` +
                `_Gunakan *${context.usedPrefix}listscrape* untuk melihat seluruh file scrape._`
            );
            return;
        }

        const scrapeBaseDir = path.resolve('scrape');
        const normalizedFile = input.endsWith('.ts') || input.endsWith('.js') ? input : `${input}.ts`;
        const targetPath = path.resolve(scrapeBaseDir, normalizedFile);

        if (!targetPath.startsWith(scrapeBaseDir)) {
            await context.reply('❌ Akses path di luar folder `scrape/` ditolak.');
            return;
        }

        if (!fs.existsSync(targetPath)) {
            await context.reply(`❌ File scrape *${normalizedFile}* tidak ditemukan di dalam folder \`scrape/\`.`);
            return;
        }

        try {
            const content = fs.readFileSync(targetPath, 'utf-8');
            const stat = fs.statSync(targetPath);
            const sizeKb = (stat.size / 1024).toFixed(1);

            await context.client.sendMessage(
                context.chatJid,
                {
                    text: content,
                    footer: `🕷️ scrape/${path.basename(targetPath)} (${sizeKb} KB) • ${context.config.botName}`,
                    buttons: [
                        {
                            type: 'copy',
                            text: '📋 Salin Kode Scrape',
                            copyCode: content
                        }
                    ]
                },
                { quoted: context.raw }
            );
        } catch (err: any) {
            await context.reply(`❌ Gagal membaca file scrape: ${err.message}`);
        }
    }
};

export default handler;

