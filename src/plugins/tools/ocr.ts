import axios from 'axios';
import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { onlineOcr } from '../../../scrape/ocr.js';

const handler: Plugin = {
    command: ['ocr'],
    category: 'tools',
    description: 'Ekstrak teks dari gambar (Optical Character Recognition)',
    execute: async (context: PluginContext): Promise<void> => {
        const quotedMsg =
            context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            (context.event as any)?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            null;

        const isDirectImage = Boolean(context.event.message?.imageMessage);
        const isQuotedImage = Boolean(quotedMsg?.imageMessage);

        let imageBuffer: Buffer | null = null;
        let ext = 'png';

        if (isDirectImage) {
            try {
                imageBuffer = await context.client.downloadMedia(context.event);
                const mime = context.event.message?.imageMessage?.mimetype || '';
                if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
            } catch {
                imageBuffer = null;
            }
        } else if (isQuotedImage) {
            try {
                imageBuffer = await context.client.downloadMedia({ message: quotedMsg });
                const mime = quotedMsg?.imageMessage?.mimetype || '';
                if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
            } catch {
                imageBuffer = null;
            }
        }

        if (!imageBuffer && context.text.trim()) {
            const matchUrl = context.text.trim().match(/https?:\/\/[^\s]+(?:\.png|\.jpg|\.jpeg|\.webp|\.avif|\.jfif)?/i);
            if (matchUrl) {
                try {
                    const downloadRes = await axios.get(matchUrl[0], {
                        responseType: 'arraybuffer',
                        timeout: 25000,
                        headers: {
                            'User-Agent':
                                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                        }
                    });
                    if (downloadRes.data && downloadRes.data.length > 500) {
                        imageBuffer = Buffer.from(downloadRes.data);
                        const cType = String(downloadRes.headers['content-type'] || '');
                        if (cType.includes('jpeg') || cType.includes('jpg')) ext = 'jpg';
                    }
                } catch {
                }
            }
        }

        if (!imageBuffer) {
            await context.reply(
                `📸 *OPTICAL CHARACTER RECOGNITION (OCR)*\n\n` +
                `⚙️ *Cara Penggunaan:*\n` +
                `› Kirim gambar dengan caption *${context.usedPrefix || '.'}${context.command}*\n` +
                `› Balas (quote) gambar dengan pesan *${context.usedPrefix || '.'}${context.command}*\n` +
                `› Atau ketik *${context.usedPrefix || '.'}${context.command} <url gambar>*`
            );
            return;
        }

        await context.reply(global.mess?.wait || '⏳ Sedang mengekstrak teks dari gambar...');

        try {
            const result = await onlineOcr(imageBuffer, `ocr.${ext}`, 'ENGLISH');
            if (!result.text) {
                await context.reply('❌ Tidak ada teks yang terdeteksi pada gambar tersebut.');
                return;
            }

            const message =
                `📝 *HASIL DETEKSI OCR*\n\n` +
                `• *Sumber Mesin:* ${result.source}\n` +
                `────────────────────\n\n` +
                `${result.text}\n\n` +
                `────────────────────\n` +
                `_Enami Asa Ai - OCR Scanner_`;

            await context.reply(message.trim());
        } catch (err: any) {
            await context.reply(`❌ Gagal membaca teks dari gambar: ${err.message || err}`);
        }
    }
};

export default handler;
