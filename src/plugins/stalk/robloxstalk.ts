import axios from 'axios';
import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { stalkRoblox } from '../../../scrape/roblox.js';

function formatNumber(num?: number | null): string {
    if (!num && num !== 0) return '0';
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toLocaleString('id-ID');
}

function formatDate(isoString?: string): string {
    if (!isoString) return '-';
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return isoString;
    }
}

const handler: Plugin = {
    command: ['robloxstalk', 'roblox'],
    category: 'stalk',
    description: 'Stalker profil Roblox dengan foto avatar dan full footer',
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
                `🎮 *ROBLOX PROFILE STALKER*\n\n` +
                `⚙️ *Format Penggunaan:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} <username>*\n\n` +
                `📌 *Contoh:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} Roblox*\n` +
                `› *${context.usedPrefix || '.'}${context.command} Builderman*`
            );
            return;
        }

        const username = input.split(/\s+/)[0].replace(/^@+/, '');
        await context.reply(global.mess?.wait || '⏳ Sedang mengumpulkan data profil Roblox...');

        try {
            const data = await stalkRoblox(username);
            const b = data.basic;

            const name = b ? b.name : username;
            const displayName = b ? b.displayName : name;
            const isVerified = b?.hasVerifiedBadge ? '☑️ (Verified)' : '';
            const isBanned = b?.isBanned ? '❌ Banned' : '✅ Aktif';
            const presenceText = data.presence?.userPresenceText || 'Offline';
            const presenceIcon = presenceText === 'Online' ? '🟢' : presenceText === 'In Game' ? '🎮' : '⚪';
            const primaryGroupName = data.groups.primary ? `${data.groups.primary.group.name} (${data.groups.primary.role.name})` : '-';
            const bioText = (b?.description || data.status || '-').replace(/\n+/g, ' ').slice(0, 150);

            const avatarUrl = data.avatar.fullBody || data.avatar.headshot || null;

            const footerText =
                `╭ ┈──ׅ─┈─ׅ─┈─ׅ─┈─ׅ─\n` +
                `│   ---- *⫹ ROBLOX STALKER ⫺* ----\n` +
                `│╭ ┈──ׅ───ׅ──ׅ─┈─ׅ─\n` +
                `││ *𖢷 ׁ 𖹭₊ Username    :* @${name}\n` +
                `││ *𖢷 ׁ 𖹭₊ Display Name:* ${displayName} ${isVerified}\n` +
                `││ *𖢷 ׁ 𖹭₊ User ID     :* ${data.userId}\n` +
                `││ *𖢷 ׁ 𖹭₊ Status Akun :* ${isBanned}\n` +
                `││ *𖢷 ׁ 𖹭₊ Kehadiran   :* ${presenceIcon} ${presenceText}\n` +
                `││ *𖢷 ׁ 𖹭₊ Dibuat Pada :* ${formatDate(b?.created)}\n` +
                `││ *𖢷 ׁ 𖹭₊ Teman (Friends):* ${formatNumber(data.social.friends)}\n` +
                `││ *𖢷 ׁ 𖹭₊ Pengikut (Followers):* ${formatNumber(data.social.followers)}\n` +
                `││ *𖢷 ׁ 𖹭₊ Mengikuti (Following):* ${formatNumber(data.social.following)}\n` +
                `││ *𖢷 ׁ 𖹭₊ Grup Utama  :* ${primaryGroupName}\n` +
                `││ *𖢷 ׁ 𖹭₊ Total Grup  :* ${data.groups.total}\n` +
                `││ *𖢷 ׁ 𖹭₊ Bio / Deskripsi:* ${bioText}\n` +
                `││ *𖢷 ׁ 𖹭₊ Link Profil :* ${data.profileUrl}\n` +
                `│╰┈─ׅ──ֺ─ֺ──ׅ──ׅ─ֺ─ֺ\n` +
                `╰┈─ׅ──ֺ─ֺ───ׅ─  ׅ ⏝ׅ︶ ׅ 𝅄`;

            // Unduh foto avatar jika tersedia
            let avatarBuffer: Buffer | undefined;
            if (avatarUrl) {
                try {
                    const avatarRes = await axios.get(avatarUrl, {
                        responseType: 'arraybuffer',
                        timeout: 15000,
                        headers: {
                            'User-Agent':
                                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                        }
                    });
                    avatarBuffer = Buffer.from(avatarRes.data);
                } catch {
                    // Abaikan jika unduhan avatar gagal
                }
            }

            // Kirim gambar Avatar dengan full footer dan no text data
            if (global.button && typeof global.button.send === 'function') {
                try {
                    await global.button.send(context, {
                        image: avatarBuffer || avatarUrl || undefined,
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
            await context.reply(`❌ Gagal mengambil data Roblox: ${err.message || err}`);
        }
    }
};

export default handler;
