import axios from 'axios';
import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { stalkTikTok, type TikTokStalkVideo } from '../../../scrape/tikninja.js';

function formatNumber(num?: number | null): string {
    if (!num && num !== 0) return '0';
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toLocaleString('id-ID');
}

function formatDuration(seconds?: number): string {
    const s = Math.floor(seconds || 0);
    if (!s) return '0s';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

const handler: Plugin = {
    command: ['ttstalk', 'tiktokstalk'],
    category: 'stalk',
    description: 'Stalker profil TikTok dengan foto profil dan full footer',
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
                `👤 *TIKTOK PROFILE STALKER*\n\n` +
                `⚙️ *Format Penggunaan:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} <username>*\n` +
                `› *${context.usedPrefix || '.'}${context.command} <username> <jumlah video (1-5)>*\n\n` +
                `📌 *Contoh:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} tiktok*\n` +
                `› *${context.usedPrefix || '.'}${context.command} @khaby.lame 3*\n` +
                `› *${context.usedPrefix || '.'}${context.command} https://www.tiktok.com/@tiktok*`
            );
            return;
        }

        const parts = input.split(/\s+/);
        let username = parts[0];
        let requestedVideoCount = 3;

        if (parts.length > 1) {
            const parsedNum = parseInt(parts[1], 10);
            if (!Number.isNaN(parsedNum) && parsedNum >= 1) {
                requestedVideoCount = Math.min(5, parsedNum);
            }
        }

        username = username.replace(/^https?:\/\/.*tiktok\.com\/@/i, '').replace(/^@/, '').split('?')[0].trim();

        await context.reply(global.mess?.wait || '⏳ Sedang mengumpulkan data profil TikTok...');

        try {
            const data = await stalkTikTok(username, requestedVideoCount);
            const u = data.user;

            let videoSummary = '';
            if (data.videos.length > 0) {
                videoSummary = `\n\n🎬 *${data.videos.length} VIDEO TERBARU:*\n`;
                data.videos.forEach((v: TikTokStalkVideo, index: number) => {
                    const cleanTitle = (v.title || 'Tanpa deskripsi').replace(/\n+/g, ' ').slice(0, 70);
                    const linkUrl = v.playUrl || (v.id ? `https://www.tiktok.com/@${u.uniqueId}/video/${v.id}` : '-');
                    videoSummary +=
                        `\n*${index + 1}.* ${cleanTitle}\n` +
                        `   › ⏱️ Durasi: ${formatDuration(v.duration)}\n` +
                        `   › 👁️ ${formatNumber(v.playCount)} tayangan | ❤️ ${formatNumber(v.diggCount)} suka\n` +
                        `   › 💬 ${formatNumber(v.commentCount)} komentar | 🔁 ${formatNumber(v.shareCount)} dibagikan\n` +
                        `   › 🔗 URL: ${linkUrl}\n`;
                });
            }

            const footerText =
                `╭ ┈──ׅ─┈─ׅ─┈─ׅ─┈─ׅ─\n` +
                `│   ---- *⫹ TIKTOK STALKER ⫺* ----\n` +
                `│╭ ┈──ׅ───ׅ──ׅ─┈─ׅ─\n` +
                `││ *𖢷 ׁ 𖹭₊ Username  :* @${u.uniqueId}\n` +
                `││ *𖢷 ׁ 𖹭₊ Nama      :* ${u.nickname} ${u.verified ? '☑️ (Verified)' : ''}\n` +
                `││ *𖢷 ׁ 𖹭₊ User ID   :* ${u.id || '-'}\n` +
                `││ *𖢷 ׁ 𖹭₊ Pengikut  :* ${formatNumber(u.followerCount)}\n` +
                `││ *𖢷 ׁ 𖹭₊ Mengikuti :* ${formatNumber(u.followingCount)}\n` +
                `││ *𖢷 ׁ 𖹭₊ Total Suka:* ${formatNumber(u.heartCount)}\n` +
                `││ *𖢷 ׁ 𖹭₊ Total Video:* ${formatNumber(u.videoCount)}\n` +
                `││ *𖢷 ׁ 𖹭₊ Bio       :* ${u.signature || '-'}\n` +
                (u.bioLink ? `││ *𖢷 ׁ 𖹭₊ Link Bio  :* ${u.bioLink}\n` : '') +
                `│╰┈─ׅ──ֺ─ֺ──ׅ──ׅ─ֺ─ֺ\n` +
                `╰┈─ׅ──ֺ─ֺ───ׅ─  ׅ ⏝ׅ︶ ׅ 𝅄` +
                videoSummary;

            // Unduh foto profil (PP) untuk dilampirkan
            let avatarBuffer: Buffer | undefined;
            if (u.avatar) {
                try {
                    const avatarRes = await axios.get(u.avatar, {
                        responseType: 'arraybuffer',
                        timeout: 15000,
                        headers: {
                            'User-Agent':
                                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                            Referer: 'https://www.tiktok.com/'
                        }
                    });
                    avatarBuffer = Buffer.from(avatarRes.data);
                } catch {
                    // Abaikan jika unduhan avatar gagal
                }
            }

            // Kirim gambar PP dengan full footer dan tanpa text body (no text data)
            if (global.button && typeof global.button.send === 'function') {
                try {
                    await global.button.send(context, {
                        image: avatarBuffer || u.avatar,
                        text: '',
                        footer: footerText,
                        buttons: []
                    }, { quote: context.raw as any });
                    return;
                } catch {
                    // Fallback
                }
            }

            if (avatarBuffer) {
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        image: avatarBuffer,
                        caption: footerText
                    },
                    { quoted: context.raw as any }
                );
            } else {
                await context.reply(footerText);
            }
        } catch (err: any) {
            await context.reply(`❌ Gagal mengambil data TikTok: ${err.message || err}`);
        }
    }
};

export default handler;
