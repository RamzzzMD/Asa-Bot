import axios from 'axios';
import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { igStalk, type IgRecentPost } from '../../../scrape/igstalk.js';

const handler: Plugin = {
    command: ['igstalk', 'instagramstalk'],
    category: 'stalk',
    description: 'Stalker profil Instagram dengan foto profil dan full footer',
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
                `📸 *INSTAGRAM PROFILE STALKER*\n\n` +
                `⚙️ *Format Penggunaan:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} <username>*\n\n` +
                `📌 *Contoh:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} jokowi*\n` +
                `› *${context.usedPrefix || '.'}${context.command} @instagram*\n` +
                `› *${context.usedPrefix || '.'}${context.command} https://www.instagram.com/jokowi*`
            );
            return;
        }

        const username = input.split(/\s+/)[0];
        await context.reply(global.mess?.wait || '⏳ Sedang mengambil data profil Instagram...');

        try {
            const result = await igStalk(username);
            if (!result.status) {
                await context.reply(`❌ ${result.message || 'Gagal mengambil data profil Instagram.'}`);
                return;
            }

            const { user: u, recent_posts } = result.data;

            let postsSummary = '';
            if (recent_posts.items.length > 0) {
                postsSummary = `\n\n📸 *${recent_posts.items.length} POSTINGAN TERBARU:*\n`;
                recent_posts.items.slice(0, 5).forEach((p: IgRecentPost, index: number) => {
                    const cleanCap = (p.caption || p.accessibility_caption || 'Tanpa keterangan').replace(/\n+/g, ' ').slice(0, 70);
                    postsSummary +=
                        `\n*${index + 1}.* [${p.type.toUpperCase()}] ${cleanCap}\n` +
                        `   › 🔗 Link: ${p.url}\n`;
                });
            }

            const footerText =
                `╭ ┈──ׅ─┈─ׅ─┈─ׅ─┈─ׅ─\n` +
                `│   ---- *⫹ INSTAGRAM STALKER ⫺* ----\n` +
                `│╭ ┈──ׅ───ׅ──ׅ─┈─ׅ─\n` +
                `││ *𖢷 ׁ 𖹭₊ Username  :* @${u.username}\n` +
                `││ *𖢷 ׁ 𖹭₊ Nama      :* ${u.full_name} ${u.is_verified ? '☑️ (Verified)' : ''}\n` +
                `││ *𖢷 ׁ 𖹭₊ User ID   :* ${u.id || '-'}\n` +
                `││ *𖢷 ׁ 𖹭₊ Status    :* ${u.is_private ? '🔒 Privat' : '🌐 Publik'}\n` +
                `││ *𖢷 ׁ 𖹭₊ Pengikut  :* ${u.stats.followers || '-'}\n` +
                `││ *𖢷 ׁ 𖹭₊ Mengikuti :* ${u.stats.following || '-'}\n` +
                `││ *𖢷 ׁ 𖹭₊ Total Post:* ${u.stats.posts || '-'}\n` +
                `││ *𖢷 ׁ 𖹭₊ Foto Profil:* ${u.profile_pic_url || '-'}\n` +
                `││ *𖢷 ׁ 𖹭₊ Bio       :* ${u.biography || '-'}\n` +
                (u.external_url ? `││ *𖢷 ׁ 𖹭₊ Link Bio  :* ${u.external_url}\n` : '') +
                `│╰┈─ׅ──ֺ─ֺ──ׅ──ׅ─ֺ─ֺ\n` +
                `╰┈─ׅ──ֺ─ֺ───ׅ─  ׅ ⏝ׅ︶ ׅ 𝅄` +
                postsSummary;

            // Unduh foto profil untuk dilampirkan
            let avatarBuffer: Buffer | undefined;
            if (u.profile_pic_url) {
                try {
                    const avatarRes = await axios.get(u.profile_pic_url, {
                        responseType: 'arraybuffer',
                        timeout: 15000,
                        headers: {
                            'User-Agent':
                                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                            Referer: 'https://www.instagram.com/'
                        }
                    });
                    avatarBuffer = Buffer.from(avatarRes.data);
                } catch {
                    // Abaikan jika unduhan avatar gagal
                }
            }

            // Kirim gambar PP dengan full footer dan no text data
            if (global.button && typeof global.button.send === 'function') {
                try {
                    await global.button.send(context, {
                        image: avatarBuffer || u.profile_pic_url || undefined,
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
            await context.reply(`❌ Gagal mengambil data Instagram: ${err.message || err}`);
        }
    }
};

export default handler;
