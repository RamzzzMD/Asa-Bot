import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['base622text'],
    category: 'tools',
    description: 'Mengembalikan format Base64/Base62 menjadi teks biasa',
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
                `🔓 *BASE62 TO TEXT*\n\n` +
                `⚙️ *Format Penggunaan:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} <teks>*\n\n` +
                `📌 *Contoh:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} SGVsZG8gV29ybGQh*`
            );
            return;
        }

        try {
            const clean = input.replace(/\s+/g, '');
            const decoded = Buffer.from(clean, 'base64').toString('utf-8');

            await context.reply(
                `🔓 *BASE62 TO TEXT*\n\n` +
                `📝 *Decoded Text:*\n${decoded}`
            );
        } catch {
            await context.reply(`❌ Format tidak valid atau gagal didecode.`);
        }
    }
};

export default handler;
