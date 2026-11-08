import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { scrapeTikTok, downloadMedia } from '../../../scrape/tiktok.js';
import { sendCoroseul } from '../../lib/helper-zapo.js';

function formatNumber(num?: number | null): string {
    if (!num && num !== 0) return '0';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toLocaleString('id-ID');
}

const handler: Plugin = {
    command: ['tiktok', 'tt', 'tiktokdl', 'ttdl'],
    category: 'downloader',
    description: 'Mengunduh semua media TikTok (video no-wm, audio, dan carousel slide foto) langsung dari URL',
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

        // Cari semua link TikTok di dalam teks
        const tiktokUrlRegex = /https?:\/\/(?:[a-zA-Z0-9_-]+\.)?(?:tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com|tt\.site|douyin\.com)\/[^\s]+/gi;
        let matchedUrls = [...input.matchAll(tiktokUrlRegex)].map((m) => m[0]);

        if (matchedUrls.length === 0) {
            matchedUrls = [...input.matchAll(/https?:\/\/[^\s]+/gi)].map((m) => m[0]);
        }

        if (matchedUrls.length === 0) {
            await context.reply(
                `🎵 *TIKTOK DOWNLOADER*\n\n` +
                `⚙️ *Format Penggunaan:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} <url tiktok>*\n\n` +
                `📌 *Contoh:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} https://vt.tiktok.com/ZS67d26A7/*\n` +
                `› *${context.usedPrefix || '.'}${context.command} https://www.tiktok.com/@user/video/...*\n\n` +
                `_Mendukung semua link TikTok: Video No WM, Slide Foto Carousel, & Audio Musik!_`
            );
            return;
        }

        await context.reply(global.mess?.wait || '⏳ Sedang mengunduh media dari TikTok...');

        // Proses setiap URL secara berurutan
        for (const targetUrl of matchedUrls) {
            try {
                const data = await scrapeTikTok(targetUrl, { includeComments: true, commentCount: 5 });

                if (!data.status) {
                    await context.reply(`❌ Gagal mengunduh: ${data.error || 'Media tidak ditemukan atau privat'}`);
                    continue;
                }

                const author = data.author || {};
                const stats = data.stats || { likes: 0, shares: 0, comments: 0, plays: 0, favorites: 0 };
                const desc = (data.description || '').trim();

                let commentPreview = '';
                if (data.topComments && data.topComments.length > 0) {
                    commentPreview = `\n\n💬 *Komentar Teratas:*\n` +
                        data.topComments.slice(0, 3).map((c, idx) => `*${idx + 1}.* @${c.user?.username || 'user'}: ${c.text.slice(0, 60)}`).join('\n');
                }

                // 1. Jika postingan adalah Slide Foto (Photo Post) -> Kirim dengan Carousel (Coroseul)
                if (data.type === 'photo' && data.media?.photos && data.media.photos.length > 0) {
                    const photos = data.media.photos;

                    if (photos.length >= 2) {
                        const cards = photos.slice(0, 10).map((imgUrl, i) => ({
                            title: `📸 Slide #${i + 1} / ${photos.length}`,
                            subtitle: `@${author.username || 'tiktok'}`,
                            body: (desc || `TikTok Slide Foto #${i + 1}`).slice(0, 95),
                            image: imgUrl,
                            buttons: [
                                {
                                    type: 'url' as const,
                                    text: 'Buka di TikTok',
                                    url: targetUrl
                                }
                            ]
                        }));

                        try {
                            await sendCoroseul(context, {
                                text: `📸 *TIKTOK SLIDE CAROUSEL*\n\n` +
                                      `👤 *Author:* ${author.nickname || 'Unknown'} (@${author.username || '-'})\n` +
                                      `❤️ *Likes:* ${formatNumber(stats.likes)} | 💬 *Comments:* ${formatNumber(stats.comments)}\n` +
                                      `🎵 *Musik:* ${data.music?.title || '-'} (${data.music?.author || '-'})\n` +
                                      (desc ? `📝 *Deskripsi:*\n${desc}\n` : '') +
                                      `_Total ${photos.length} slide foto_` +
                                      commentPreview,
                                footer: 'Enami Asa Ai • TikTok Slide',
                                cards
                            });
                        } catch {
                            // Fallback kirim biasa jika carousel gagal di client WA
                            for (let i = 0; i < photos.length; i++) {
                                try {
                                    const imgBuf = await downloadMedia(photos[i]);
                                    await context.client.sendMessage(
                                        context.chatJid,
                                        { image: imgBuf, caption: `📸 Slide ${i + 1}/${photos.length}` },
                                        { quoted: context.raw as any }
                                    );
                                } catch {}
                            }
                        }
                    } else {
                        // Jika hanya 1 foto
                        try {
                            const imgBuf = await downloadMedia(photos[0]);
                            const caption =
                                `📸 *TIKTOK PHOTO*\n\n` +
                                `👤 *Author:* ${author.nickname || 'Unknown'} (@${author.username || '-'})\n` +
                                `❤️ *Likes:* ${formatNumber(stats.likes)} | 💬 *Comments:* ${formatNumber(stats.comments)}\n` +
                                `🎵 *Musik:* ${data.music?.title || '-'} (${data.music?.author || '-'})\n` +
                                (desc ? `📝 *Deskripsi:*\n${desc}` : '') +
                                commentPreview;

                            await context.client.sendMessage(
                                context.chatJid,
                                { image: imgBuf, caption },
                                { quoted: context.raw as any }
                            );
                        } catch (err: any) {
                            console.error('Gagal mengirim foto TikTok:', err.message);
                        }
                    }

                    // Kirim audio langsung bersamaan dengan slide foto
                    if (data.music?.playUrl) {
                        try {
                            const audioBuf = await downloadMedia(data.music.playUrl);
                            await context.client.sendMessage(
                                context.chatJid,
                                {
                                    audio: audioBuf,
                                    mimetype: 'audio/mpeg',
                                    ptt: false
                                },
                                { quoted: context.raw as any }
                            );
                        } catch (audioErr: any) {
                            console.error('Gagal mengirim audio slide TikTok:', audioErr.message);
                        }
                    }
                    continue;
                }

                // 2. Jika postingan adalah Video
                const videoUrl = data.media?.video?.directStreamUrl || data.media?.video?.downloadUrl || data.media?.video?.noWatermark;
                if (!videoUrl) {
                    await context.reply('❌ Tidak dapat menemukan URL video tanpa watermark pada postingan TikTok ini.');
                    continue;
                }

                const videoHeaders = data.media?.video?.headers || {};
                const videoBuffer = await downloadMedia(videoUrl, videoHeaders);

                const caption =
                    `🎬 *TIKTOK DOWNLOADER (NO WM)*\n\n` +
                    `👤 *Author:* ${author.nickname || 'Unknown'} (@${author.username || '-'})\n` +
                    `❤️ *Likes:* ${formatNumber(stats.likes)} | 💬 *Comments:* ${formatNumber(stats.comments)}\n` +
                    `▶️ *Plays:* ${formatNumber(stats.plays)} | 🔁 *Shares:* ${formatNumber(stats.shares)}\n` +
                    `🎵 *Musik:* ${data.music?.title || '-'} (${data.music?.author || '-'})\n` +
                    (desc ? `📝 *Deskripsi:*\n${desc}` : '') +
                    commentPreview;

                // Kirim Video No WM
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        video: videoBuffer,
                        caption
                    },
                    { quoted: context.raw as any }
                );

                // Kirim Audio langsung
                if (data.music?.playUrl) {
                    try {
                        const audioBuffer = await downloadMedia(data.music.playUrl);
                        await context.client.sendMessage(
                            context.chatJid,
                            {
                                audio: audioBuffer,
                                mimetype: 'audio/mpeg',
                                ptt: false
                            },
                            { quoted: context.raw as any }
                        );
                    } catch (audioErr: any) {
                        console.error('Gagal mengirim audio TikTok:', audioErr.message);
                    }
                }
            } catch (err: any) {
                await context.reply(`❌ Gagal mengunduh TikTok (${targetUrl}): ${err.message || err}`);
            }
        }
    }
};

export default handler;
