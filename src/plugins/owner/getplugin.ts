import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['getplugin', 'getp', 'gp'],
    category: 'owner',
    description: 'Mengambil dan menampilkan kode sumber sebuah file plugin',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const input = context.text.trim();
        if (!input) {
            await context.reply(
                `*Cara Penggunaan:*\n` +
                `› *${context.usedPrefix}${context.command} main/ping.ts*\n` +
                `› *${context.usedPrefix}${context.command} group/kick.ts*\n\n` +
                `_Gunakan *${context.usedPrefix}listplugin* untuk melihat seluruh file plugin._`
            );
            return;
        }

        const pluginsBaseDir = path.resolve('src/plugins');
        const targetPath = path.resolve(pluginsBaseDir, input.endsWith('.ts') || input.endsWith('.js') ? input : `${input}.ts`);

        if (!targetPath.startsWith(pluginsBaseDir)) {
            await context.reply('❌ Akses path di luar folder plugins ditolak.');
            return;
        }

        if (!fs.existsSync(targetPath)) {
            await context.reply(`❌ Plugin *${input}* tidak ditemukan di dalam *src/plugins/*`);
            return;
        }

        try {
            const content = fs.readFileSync(targetPath, 'utf-8');
            const stat = fs.statSync(targetPath);
            const sizeKb = (stat.size / 1024).toFixed(1);

            await context.client.sendMessage(context.chatJid, {
                text: content,
                footer: `📄 ${path.basename(targetPath)} (${sizeKb} KB)`,
                buttons: [
                    {
                        type: 'copy',
                        text: 'Salin Kode',
                        copyCode: content
                    }
                ]
            }, { quoted: context.raw });
        } catch (err: any) {
            console.error(err);
            await context.reply(`❌ Gagal membaca plugin: ${err.message}`);
        }
    }
};

export default handler;
