import axios from 'axios';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

async function cropToSquareJpeg(imageBuffer: Buffer): Promise<Buffer> {
    const img = await loadImage(imageBuffer);
    const minSide = Math.min(img.width, img.height);
    const sx = Math.floor((img.width - minSide) / 2);
    const sy = Math.floor((img.height - minSide) / 2);

    const canvas = createCanvas(640, 640);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, 640, 640);
    return canvas.toBuffer('image/jpeg');
}

const handler: Plugin = {
    command: ['setppgc'],
    category: 'group',
    description: 'Mengubah foto profil (PP) atau ikon grup',
    group: true,
    admin: true,
    botadmin: true,
    owner: false,
    limit: false,
    execute: async (context: PluginContext): Promise<void> => {
        const quotedMsg =
            context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            (context.event as any)?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            null;

        const isDirectImage = Boolean(context.event.message?.imageMessage);
        const isQuotedImage = Boolean(quotedMsg?.imageMessage);

        let imageBuffer: Buffer | null = null;

        if (isDirectImage) {
            try {
                imageBuffer = await context.client.downloadMedia(context.event);
            } catch {
                imageBuffer = null;
            }
        } else if (isQuotedImage) {
            try {
                imageBuffer = await context.client.downloadMedia({ message: quotedMsg });
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
                    }
                } catch {
                    imageBuffer = null;
                }
            }
        }

        if (!imageBuffer) {
            await context.reply(
                `🖼️ *UBAH FOTO PROFIL GRUP*\n\n` +
                `⚙️ *Cara Penggunaan:*\n` +
                `› Kirim gambar dengan caption *${context.usedPrefix || '.'}${context.command}*\n` +
                `› Balas (reply) gambar dengan *${context.usedPrefix || '.'}${context.command}*\n` +
                `› Atau sertakan URL gambar: *${context.usedPrefix || '.'}${context.command} <url gambar>*`
            );
            return;
        }

        await context.reply(global.mess?.wait || '⏳ Sedang memperbarui foto profil grup...');

        try {
            const squareJpeg = await cropToSquareJpeg(imageBuffer);
            await context.client.updateProfilePicture(context.chatJid, squareJpeg);
            await context.reply('✅ *Foto profil grup berhasil diperbarui!*');
        } catch (err: any) {
            await context.reply(`❌ Gagal memperbarui foto profil grup: ${err?.message || err}`);
        }
    }
};

export default handler;
