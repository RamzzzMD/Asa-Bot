import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { fetchVideo, renderMedia } from '../../../scrape/facebook.js';

const handler: Plugin = {
    command: ['facebook', 'fb', 'fbdl', 'facebookdl'],
    category: 'downloader',
    description: 'Mengunduh video, reels, dan audio dari Facebook dalam resolusi terbaik (HD/SD)',
    execute: async (context: PluginContext): Promise<void> => {
        let input = context.text.trim();

        if (!input) {
            const quotedText =
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
                '';
            if (quotedText) {
                input = quotedText.trim();
            }
        }

        const urlMatch = input.match(/https?:\/\/(?:[\w-]+\.)?(?:facebook\.com|fb\.watch|fb\.gg|fb\.com)\/[^\s]+/i) ||
                         input.match(/https?:\/\/[^\s]+/i);

        if (!urlMatch) {
            await context.reply(
                `📘 *FACEBOOK VIDEO & REELS DOWNLOADER*\n\n` +
                `⚙️ *Cara Penggunaan:*\n` +
                `› *${context.usedPrefix}${context.command} <url facebook>*\n` +
                `› Atau reply link Facebook dengan *${context.usedPrefix}${context.command}*\n\n` +
                `📌 *Contoh:*\n` +
                `› *${context.usedPrefix}${context.command} https://www.facebook.com/watch/?v=...*\n` +
                `› *${context.usedPrefix}${context.command} https://fb.watch/...*`
            );
            return;
        }

        const targetUrl = urlMatch[0];
        await context.reply(global.mess?.wait || '⏳ Sedang mengunduh video dari Facebook...');

        try {
            const data = await fetchVideo(targetUrl);
            const medias = data.medias || [];

            if (medias.length === 0) {
                await context.reply('❌ Tidak ditemukan stream media pada tautan Facebook tersebut.');
                return;
            }

            // Pilih video terbaik (prioritaskan yang langsung memiliki URL atau videoUrl, lalu HD)
            const videoItems = medias.filter((m: any) => m.type === 'video' || m.extension === 'mp4' || !m.type);
            const chosenVideo =
                videoItems.find((m: any) => !m.needsRender && m.url && /1080|720|hd/i.test(String(m.quality || m.resolution))) ||
                videoItems.find((m: any) => !m.needsRender && m.url) ||
                videoItems.find((m: any) => m.videoUrl) ||
                videoItems[0] ||
                medias[0];

            let finalVideoUrl = chosenVideo?.url || chosenVideo?.videoUrl || null;

            if (!finalVideoUrl && chosenVideo?.needsRender) {
                try {
                    const rendered = await renderMedia(chosenVideo, { maxWaitMs: 60000 });
                    finalVideoUrl = rendered.url;
                } catch {}
            }

            if (!finalVideoUrl) {
                await context.reply('❌ Gagal mendapatkan URL unduhan video Facebook.');
                return;
            }

            const caption =
                `📘 *FACEBOOK DOWNLOADER*\n\n` +
                `• *Judul:* ${data.title || 'Facebook Video'}\n` +
                (chosenVideo?.quality || chosenVideo?.resolution
                    ? `• *Kualitas:* ${chosenVideo.quality || chosenVideo.resolution}\n`
                    : '') +
                (data.duration ? `• *Durasi:* ${data.duration}\n` : '') +
                (data.description ? `• *Deskripsi:* ${String(data.description).slice(0, 300)}\n` : '') +
                `\n_${context.config.botName} • Facebook Downloader_`;

            await context.client.sendMessage(
                context.chatJid,
                {
                    video: { url: finalVideoUrl },
                    caption
                },
                { quoted: context.raw }
            );

            // Jika terdapat stream audio terpisah, kirimkan juga
            const audioItem = medias.find((m: any) => m.type === 'audio' || m.extension === 'mp3' || m.extension === 'm4a');
            const audioUrl = audioItem?.url || audioItem?.audioUrl;
            if (audioUrl) {
                try {
                    await context.client.sendMessage(
                        context.chatJid,
                        {
                            audio: { url: audioUrl },
                            mimetype: 'audio/mpeg',
                            ptt: false
                        },
                        { quoted: context.raw }
                    );
                } catch {}
            }
        } catch (err: any) {
            await context.reply(`❌ Gagal mengunduh video Facebook: ${err.message || err}`);
        }
    }
};

export default handler;

