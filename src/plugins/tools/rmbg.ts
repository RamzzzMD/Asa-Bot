import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { removeBg, downloadMedia } from '../../../scrape/rmbg.js';

const handler: Plugin = {
    command: ['rmbg', 'removebg', 'nobg'],
    category: 'tools',
    description: 'Menghapus latar belakang (background) gambar secara otomatis menggunakan AI (No APIKey)',
    execute: async (context: PluginContext): Promise<void> => {
        const quotedMsg =
            context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            (context.event as any)?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            null;

        const isDirectImage = Boolean(context.event.message?.imageMessage);
        const isQuotedImage = Boolean(quotedMsg?.imageMessage);

        let imageInput: Buffer | string | null = null;

        if (isDirectImage) {
            try {
                imageInput = await context.client.downloadMedia(context.event);
            } catch {
                imageInput = null;
            }
        } else if (isQuotedImage) {
            try {
                imageInput = await context.client.downloadMedia({ message: quotedMsg });
            } catch {
                imageInput = null;
            }
        } else if (context.text.trim()) {
            const urlMatch = context.text.trim().match(/https?:\/\/[^\s]+/i);
            if (urlMatch) {
                imageInput = urlMatch[0];
            }
        }

        if (!imageInput) {
            await context.reply(
                `✂️ *AI REMOVE BACKGROUND*\n\n` +
                `⚙️ *Cara Penggunaan:*\n` +
                `› Kirim gambar dengan caption *${context.usedPrefix}${context.command}*\n` +
                `› Balas (reply) gambar dengan *${context.usedPrefix}${context.command}*\n` +
                `› Atau ketik *${context.usedPrefix}${context.command} <url gambar>*`
            );
            return;
        }

        await context.reply(global.mess?.wait || '⏳ Sedang menghapus background gambar, mohon tunggu...');

        try {
            const res = await removeBg(imageInput);
            let outBuffer = res.buffer;

            if (!outBuffer && res.outputUrl) {
                outBuffer = await downloadMedia(res.outputUrl);
            }

            if (!outBuffer) {
                await context.reply('❌ Gagal mengunduh hasil gambar tanpa background.');
                return;
            }

            await context.client.sendMessage(
                context.chatJid,
                {
                    image: outBuffer,
                    caption:
                        `✂️ *BACKGROUND BERHASIL DIHAPUS*\n\n` +
                        (res.width && res.height ? `• *Resolusi:* ${res.width}x${res.height}\n` : '') +
                        `_${context.config.botName} • Slazzer AI Engine_`
                },
                { quoted: context.raw }
            );
        } catch (err: any) {
            await context.reply(`❌ Gagal menghapus background: ${err.message || err}`);
        }
    }
};

export default handler;

