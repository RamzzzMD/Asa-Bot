import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { getPin, lens, downloadMedia } from '../../../scrape/pinterest.js';

const handler: Plugin = {
    command: ['pindl', 'pinterestdl', 'pinlens'],
    category: 'downloader',
    description: 'Unduh video, GIF, carousel slide, atau gambar HD dari Pinterest & pencarian visual Pinterest Lens',
    execute: async (context: PluginContext): Promise<void> => {
        const quotedMsg =
            context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            (context.event as any)?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            null;

        const quotedText =
            quotedMsg?.conversation ||
            quotedMsg?.extendedTextMessage?.text ||
            '';

        const input = context.text.trim() || quotedText.trim();
        const isDirectImage = Boolean(context.event.message?.imageMessage);
        const isQuotedImage = Boolean(quotedMsg?.imageMessage);

        if (context.command === 'pinlens' || ((isDirectImage || isQuotedImage) && !input)) {
            let lensTarget: Buffer | string | null = null;
            if (isDirectImage) {
                try {
                    lensTarget = await context.client.downloadMedia(context.event);
                } catch {}
            } else if (isQuotedImage) {
                try {
                    lensTarget = await context.client.downloadMedia({ message: quotedMsg });
                } catch {}
            } else if (input) {
                lensTarget = input;
            }

            if (!lensTarget) {
                await context.reply(
                    `🔍 *PINTEREST VISUAL LENS*\n\n` +
                    `› Kirim atau balas (reply) gambar dengan *${context.usedPrefix}pinlens*\n` +
                    `› Atau masukkan URL Pin/Gambar: *${context.usedPrefix}pinlens <url>*`
                );
                return;
            }

            await context.reply(global.mess?.wait || '🔍 Sedang mencari gambar serupa menggunakan Pinterest Lens...');
            try {
                const res = await lens(lensTarget, { pageSize: 6 });
                const items = (res.results || []).filter((it: any) => it.image).slice(0, 5);
                if (items.length === 0) {
                    await context.reply('❌ Tidak ditemukan hasil visual yang cocok di Pinterest.');
                    return;
                }

                const medias = items.map((item: any, idx: number) => ({
                    image: { url: item.image },
                    caption:
                        `🔍 *Pinterest Lens #${idx + 1}*\n` +
                        `• *Topik Visual:* ${res.recognizedQuery || res.searchQuery || '-'}\n` +
                        (item.title ? `• *Judul:* ${item.title}\n` : '') +
                        `🔗 ${item.url || ''}`
                }));

                await context.conn.sendAlbumMessage(context.chatJid, medias, { quoted: context.raw });
            } catch (err: any) {
                await context.reply(`❌ Gagal menjalankan Pinterest Lens: ${err.message || err}`);
            }
            return;
        }

        if (!input) {
            await context.reply(
                `📌 *PINTEREST DOWNLOADER (VIDEO / CAROUSEL / FOTO)*\n\n` +
                `⚙️ *Cara Penggunaan:*\n` +
                `› *${context.usedPrefix}${context.command} <url pinterest / pin id>*\n` +
                `› Atau reply link Pinterest dengan *${context.usedPrefix}${context.command}*\n\n` +
                `📌 *Contoh:*\n` +
                `› *${context.usedPrefix}${context.command} https://pin.it/xxxxxx*\n` +
                `› *${context.usedPrefix}${context.command} https://www.pinterest.com/pin/123456789/*`
            );
            return;
        }

        await context.reply(global.mess?.wait || '⏳ Sedang mengunduh media dari Pinterest...');

        try {
            const pin = await getPin(input);
            const caption =
                `📌 *PINTEREST DOWNLOADER*\n\n` +
                `• *Judul:* ${pin.title || 'Pinterest Media'}\n` +
                `• *Tipe:* ${pin.type.toUpperCase()}\n` +
                (pin.pinner?.username ? `• *Kreator:* ${pin.pinner.fullName || ''} (@${pin.pinner.username})\n` : '') +
                (pin.board?.name ? `• *Board:* ${pin.board.name}\n` : '') +
                (pin.description ? `• *Deskripsi:* ${pin.description}\n` : '') +
                `🔗 ${pin.url}\n\n` +
                `_${context.config.botName} • Pinterest Downloader_`;

            if (pin.isVideo && pin.video?.downloadUrl) {
                const vidBuf = await downloadMedia(pin.video.downloadUrl);
                await context.client.sendMessage(
                    context.chatJid,
                    { video: vidBuf, caption },
                    { quoted: context.raw }
                );
                return;
            }

            if (pin.isCarousel && Array.isArray(pin.carousel) && pin.carousel.length > 0) {
                if (pin.carousel.length === 1) {
                    const imgBuf = await downloadMedia(pin.carousel[0].url);
                    await context.client.sendMessage(
                        context.chatJid,
                        { image: imgBuf, caption },
                        { quoted: context.raw }
                    );
                    return;
                }

                const medias = pin.carousel.slice(0, 10).map((slide: any, idx: number) => ({
                    image: { url: slide.url },
                    caption: idx === 0 ? caption : `📌 Slide #${idx + 1} ${slide.title || ''}`
                }));
                await context.conn.sendAlbumMessage(context.chatJid, medias, { quoted: context.raw });
                return;
            }

            if (pin.image) {
                const imgBuf = await downloadMedia(pin.image);
                await context.client.sendMessage(
                    context.chatJid,
                    { image: imgBuf, caption },
                    { quoted: context.raw }
                );
                return;
            }

            await context.reply('❌ Media tidak ditemukan pada Pin tersebut.');
        } catch (err: any) {
            await context.reply(`❌ Gagal mengunduh Pinterest: ${err.message || err}`);
        }
    }
};

export default handler;

