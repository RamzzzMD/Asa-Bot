import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['text2base62'],
    category: 'tools',
    description: 'Mengubah teks menjadi format Base64/Base62',
    execute: async (context: PluginContext): Promise<void> => {
        let input = context.text.trim();

        if (!input) {
            const quotedText =
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text;

            if (quotedText) {
                input = quotedText.trim();
            }
        }

        if (!input) {
            await context.reply(
                `📦 *TEXT TO BASE62*\n\n` +
                `⚙️ *Format Penggunaan:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} <teks>*\n\n` +
                `📌 *Contoh:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} Halo Dunia!*`
            );
            return;
        }

        try {
            const encoded = Buffer.from(input, 'utf-8').toString('base64');
            await context.reply(
                `📦 *TEXT TO BASE62*\n\n` +
                `📝 *Original:* ${input}\n` +
                `🔐 *Hasil:*\n\`${encoded}\``
            );
        } catch (err: any) {
            await context.reply(`❌ Gagal mengubah teks: ${err.message || err}`);
        }
    }
};

export default handler;
