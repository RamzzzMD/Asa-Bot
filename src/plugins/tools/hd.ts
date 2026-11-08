import axios from 'axios';
import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { upscaleImage } from '../../../scrape/upscaler.js';

const handler: Plugin = {
    command: ['hd', 'remini', 'upscale'],
    category: 'tools',
    description: 'Meningkatkan resolusi foto menjadi HD (4x) menggunakan AI Upscaler',
    owner: false,
    premium: false,
    group: false,
    private: false,
    admin: false,
    botadmin: false,
    limit: true,
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

        // Jika tidak ada media terlampir, cek apakah user mengirim URL gambar di teks
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
                } catch {}
            }
        }

        if (!imageBuffer) {
            await context.reply(
                `✨ *AI IMAGE UPSCALER (HD 4X)*\n\n` +
                `⚙️ *Cara Penggunaan:*\n` +
                `› Kirim gambar dengan caption *${context.usedPrefix || '.'}${context.command}*\n` +
                `› Atau balas (quote) gambar yang sudah dikirim dengan ketik *${context.usedPrefix || '.'}${context.command}*\n` +
                `› Atau ketik *${context.usedPrefix || '.'}${context.command} <url gambar>*\n\n` +
                `💎 *Fitur:*\n` +
                `• Peningkatan resolusi 4x lipat (Ultra HD)\n` +
                `• Pemulihan detail wajah & tekstur objek\n` +
                `• Dukungan otomatis bypass kuota`
            );
            return;
        }

        await context.reply('⏳ ᴍᴏʜᴏɴ ᴛᴜɴɢɢᴜ, sᴇᴅᴀɴɢ ᴍᴇɴɪɴɢᴋᴀᴛᴋᴀɴ ᴋᴜᴀʟɪᴛᴀs ғᴏᴛᴏ (ʜᴅ 4x)... 🎀✨');

        try {
            const startTime = Date.now();
            const result = await upscaleImage(imageBuffer, ext, { scale: 4 });
            const processTime = ((Date.now() - startTime) / 1000).toFixed(1);

            const sizeMb = (result.buffer.length / (1024 * 1024)).toFixed(2);
            const caption =
                `✨ *HASIL HD UPSCALER (4X)*\n\n` +
                `• *Skala:* 4x Lipat (Ultra HD)\n` +
                `• *Ukuran File:* ${sizeMb} MB\n` +
                `• *Waktu Proses:* ${processTime}s\n` +
                `• *Mesin:* ${result.source === 'imageupscaler' ? 'ImageUpscaler 4x' : 'ImgUpscaler AI (Bypass)'}\n\n` +
                `_Enami Asa Ai - AI Photo Enhancer_`;

            await context.client.sendMessage(
                context.chatJid,
                {
                    image: result.buffer,
                    caption
                },
                { quoted: context.raw }
            );
        } catch (err: any) {
            await context.reply(`❌ Gagal meningkatkan kualitas foto: ${err.message || err}`);
        }
    }
};

export default handler;
