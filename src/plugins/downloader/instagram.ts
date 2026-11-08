import axios from 'axios';
import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { instagramDownload, type InstagramMedia } from '../../../scrape/instagram.js';

function formatNumber(num?: number | null): string {
    if (!num && num !== 0) return '0';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toLocaleString('id-ID');
}

const handler: Plugin = {
    command: ['instagram', 'ig'],
    category: 'downloader',
    description: 'Mengunduh foto, video, carousel/slide, reels, dan story Instagram',
    owner: false,
    premium: false,
    group: false,
    private: false,
    admin: false,
    botadmin: false,
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

        const urlMatch = input.match(/https?:\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\/[^\s]+/i) ||
            input.match(/https?:\/\/[^\s]+/i);

        if (!urlMatch) {
            await context.reply(
                `📸 *INSTAGRAM DOWNLOADER*\n\n` +
                `⚙️ *Format Penggunaan:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} <url instagram>*\n\n` +
                `📌 *Contoh:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} https://www.instagram.com/reel/Cxxxxxx/*\n` +
                `› *${context.usedPrefix || '.'}${context.command} https://www.instagram.com/p/Cxxxxxx/*\n\n` +
                `_Mendukung Reels, Post, Carousel/Slide, dan Story!_`
            );
            return;
        }

        const targetUrl = urlMatch[0];

        await context.reply(global.mess?.wait || '⏳ Sedang mengunduh media dari Instagram...');

        try {
            let medias: InstagramMedia[] = [];
            let username = 'Instagram User';
            let caption = '';

            const res = await instagramDownload(targetUrl);
            if (res && res.medias && res.medias.length > 0) {
                medias = res.medias;
                username = res.post_info?.username || username;
                caption = res.post_info?.caption || caption;
            }

            if (!medias || medias.length === 0) {
                await context.reply('❌ Tidak dapat menemukan media pada tautan Instagram ini. Pastikan akun tidak privat.');
                return;
            }

            for (let i = 0; i < medias.length; i++) {
                const item = medias[i];
                if (!item.download_url) continue;

                try {
                    const dlRes = await axios.get(item.download_url, {
                        responseType: 'arraybuffer',
                        timeout: 60000,
                        headers: {
                            'User-Agent':
                                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                            Referer: 'https://www.instagram.com/'
                        }
                    });

                    const mediaBuf = Buffer.from(dlRes.data);
                    const isVid = item.type === 'video' || item.download_url.includes('.mp4');

                    const textCaption = i === 0
                        ? `📸 *INSTAGRAM DOWNLOADER*\n\n` +
                          `👤 *User:* @${username}\n` +
                          (medias.length > 1 ? `📂 *Total Media:* ${medias.length}\n` : '') +
                          (caption ? `📝 *Caption:*\n${caption.slice(0, 1000)}` : '')
                        : `📸 *Media ${i + 1}/${medias.length}*`;

                    if (isVid) {
                        await context.client.sendMessage(
                            context.chatJid,
                            { video: mediaBuf, caption: textCaption },
                            { quoted: context.raw }
                        );
                    } else {
                        await context.client.sendMessage(
                            context.chatJid,
                            { image: mediaBuf, caption: textCaption },
                            { quoted: context.raw }
                        );
                    }
                } catch (sendErr: any) {
                    console.error(`Gagal mengirim media IG ke-${i + 1}:`, sendErr.message);
                }
            }
        } catch (err: any) {
            await context.reply(`❌ Gagal mengunduh Instagram: ${err.message || err}`);
        }
    }
};

export default handler;
