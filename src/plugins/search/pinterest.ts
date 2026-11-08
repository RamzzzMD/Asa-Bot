import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { search, getPin, lens, downloadMedia } from '../../../scrape/pinterest.js';

const handler: Plugin = {
    command: ['pinterest', 'pin'],
    category: 'search',
    description: 'Cari gambar Pinterest dalam bentuk album, unduh Pin URL, atau pencarian visual (Pinterest Lens)',
    execute: async (context: PluginContext): Promise<void> => {
        const { conn, m, chatJid, text, usedPrefix, command, reply } = context;

        const quotedMsg =
            context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            (context.event as any)?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            null;

        const quotedText =
            quotedMsg?.conversation ||
            quotedMsg?.extendedTextMessage?.text ||
            '';

        const query = text.trim() || quotedText.trim();

        // 1. Jika mengirim/reply gambar tanpa teks -> Visual Lens Search
        const isDirectImage = Boolean(context.event.message?.imageMessage);
        const isQuotedImage = Boolean(quotedMsg?.imageMessage);

        if ((isDirectImage || isQuotedImage) && !query) {
            await reply(global.mess?.wait || '🔍 Sedang menganalisis gambar dengan Pinterest Visual Lens...');
            try {
                const imgBuf = isDirectImage
                    ? await context.client.downloadMedia(context.event)
                    : await context.client.downloadMedia({ message: quotedMsg });

                const lensRes = await lens(imgBuf, { pageSize: 6 });
                const items = (lensRes.results || []).filter((it: any) => it.image).slice(0, 5);
                if (items.length === 0) {
                    await reply('❌ Tidak ditemukan hasil serupa di Pinterest.');
                    return;
                }

                const medias = items.map((item: any, idx: number) => ({
                    image: { url: item.image },
                    caption:
                        `🔍 *Pinterest Lens #${idx + 1}*\n` +
                        `• *Deteksi Objek:* ${lensRes.recognizedQuery || '-'}\n` +
                        (item.title ? `• *Judul:* ${item.title}\n` : '') +
                        `🔗 ${item.url || ''}`
                }));

                await conn.sendAlbumMessage(m?.chat || chatJid, medias, { quoted: m || context.event });
            } catch (err: any) {
                await reply(`❌ Gagal memproses Pinterest Lens: ${err.message || err}`);
            }
            return;
        }

        if (!query) {
            await reply(
                `📌 *PINTEREST SEARCH, DOWNLOADER & LENS*\n\n` +
                `⚙️ *Cara Penggunaan:*\n` +
                `1. *Cari Gambar:* *${usedPrefix}${command} anime aesthetic*\n` +
                `2. *Unduh Pin (Video/Carousel/Foto):* *${usedPrefix}${command} https://pin.it/...*\n` +
                `3. *Visual Lens:* Kirim/Reply gambar dengan *${usedPrefix}${command}*`
            );
            return;
        }

        // 2. Jika input adalah URL Pinterest -> Unduh Pin otomatis
        if (/pinterest\.com\/pin\/|pin\.it\//i.test(query)) {
            await reply(global.mess?.wait || '⏳ Sedang mengunduh konten dari Pinterest...');
            try {
                const pin = await getPin(query);
                const caption =
                    `📌 *PINTEREST DOWNLOADER*\n\n` +
                    `• *Judul:* ${pin.title || 'Pinterest Pin'}\n` +
                    `• *Tipe:* ${pin.type.toUpperCase()}\n` +
                    (pin.pinner?.username ? `• *Author:* ${pin.pinner.fullName || ''} (@${pin.pinner.username})\n` : '') +
                    (pin.description ? `• *Deskripsi:* ${pin.description}\n` : '') +
                    `🔗 ${pin.url}\n\n` +
                    `_${context.config.botName} • Pinterest Downloader_`;

                if (pin.isVideo && pin.video?.downloadUrl) {
                    const vidBuf = await downloadMedia(pin.video.downloadUrl);
                    await context.client.sendMessage(
                        chatJid,
                        { video: vidBuf, caption },
                        { quoted: context.raw }
                    );
                    return;
                }

                if (pin.isCarousel && Array.isArray(pin.carousel) && pin.carousel.length > 1) {
                    const medias = pin.carousel.slice(0, 10).map((slide: any, idx: number) => ({
                        image: { url: slide.url },
                        caption: idx === 0 ? caption : `📌 Slide #${idx + 1} ${slide.title || ''}`
                    }));
                    await conn.sendAlbumMessage(m?.chat || chatJid, medias, { quoted: m || context.event });
                    return;
                }

                if (pin.image) {
                    const imgBuf = await downloadMedia(pin.image);
                    await context.client.sendMessage(
                        chatJid,
                        { image: imgBuf, caption },
                        { quoted: context.raw }
                    );
                    return;
                }

                await reply('❌ Tidak dapat menemukan media pada Pin tersebut.');
            } catch (err: any) {
                await reply(`❌ Gagal mengunduh Pin: ${err.message || err}`);
            }
            return;
        }

        // 3. Pencarian standar
        await reply(global.mess?.wait || '⏳ Sedang mencari di Pinterest...');

        try {
            const result = await search(query, { pageSize: 12 });
            const items = (result.results || []).filter((item: any) => item && item.image).slice(0, 5);

            if (items.length === 0) {
                await reply(`❌ Gambar Pinterest untuk *"${query}"* tidak ditemukan.`);
                return;
            }

            if (items.length === 1) {
                await context.client.sendMessage(
                    chatJid,
                    {
                        image: { url: items[0].image },
                        caption: `📌 *Pinterest*\n• *Keyword:* ${query}\n🔗 ${items[0].url || ''}`
                    },
                    { quoted: context.raw }
                );
                return;
            }

            const medias = items.map((item: any, index: number) => ({
                image: { url: item.image },
                caption:
                    `📌 *Pinterest #${index + 1}*\n` +
                    `*Keyword:* ${query}\n` +
                    (item.title ? `*Title:* ${item.title}\n` : '') +
                    `🔗 ${item.url || ''}`
            }));

            await conn.sendAlbumMessage(m?.chat || chatJid, medias, { quoted: m || context.event });
        } catch (err: any) {
            await reply(`❌ Terjadi kesalahan saat mencari di Pinterest: ${err.message || err}`);
        }
    }
};

export default handler;
