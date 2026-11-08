import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['getfile', 'file', 'dlfile'],
    category: 'owner',
    description: 'Mengambil file dari server bot dan mengirimkannya sebagai dokumen',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const filePathInput = context.text.trim();
        if (!filePathInput) {
            await context.reply(
                `*Cara Penggunaan:*\n` +
                `› *${context.usedPrefix}${context.command} package.json*\n` +
                `› *${context.usedPrefix}${context.command} src/lib/config.ts*`
            );
            return;
        }

        const resolved = path.resolve(filePathInput);
        if (!fs.existsSync(resolved)) {
            await context.reply(`❌ File tidak ditemukan: *${filePathInput}*`);
            return;
        }

        if (!fs.statSync(resolved).isFile()) {
            await context.reply(`❌ Path *${filePathInput}* adalah direktori, bukan file.`);
            return;
        }

        try {
            const buffer = fs.readFileSync(resolved);
            const fileName = path.basename(resolved);

            await context.client.sendMessage(context.chatJid, {
                document: buffer,
                filename: fileName,
                mimetype: 'application/octet-stream'
            }, { quoted: context.raw });
        } catch (err: any) {
            console.error(err);
            await context.reply(`❌ Gagal mengirim file: ${err.message}`);
        }
    }
};

export default handler;
