import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { search, episodes, type LoklokSearchItem, type LoklokEpisodeItem } from '../../../scrape/loklok.js';
import { sendCoroseul } from '../../lib/helper-zapo.js';

const handler: Plugin = {
    command: ['loklok'],
    category: 'search',
    description: 'Cari film, drama, dan anime di Loklok lengkap dengan episode & link streaming',
    execute: async (context: PluginContext): Promise<void> => {
        const text = context.text.trim();
        const args = context.args;

        if (!text) {
            await context.reply(
                `🎬 *LOKLOK MOVIE & DRAMA FINDER*\n\n` +
                `⚙️ *Format Penggunaan:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} <judul film/drama/anime>*\n` +
                `› *${context.usedPrefix || '.'}${context.command} eps <id> <category>*\n\n` +
                `📌 *Contoh:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} Avatar*\n` +
                `› *${context.usedPrefix || '.'}${context.command} Solo Leveling*\n` +
                `› *${context.usedPrefix || '.'}${context.command} eps 36480 0*`
            );
            return;
        }

        // Sub-command: Cek episode
        if (args[0]?.toLowerCase() === 'eps' || args[0]?.toLowerCase() === 'episode') {
            const contentId = args[1];
            const category = parseInt(args[2] || '1', 10);

            if (!contentId) {
                await context.reply(`Contoh: *${context.usedPrefix || '.'}${context.command} eps 36480 0*`);
                return;
            }

            await context.reply(global.mess?.wait || '⏳ Mengambil daftar episode...');

            const epsData = await episodes(contentId, category);
            if (!epsData.status || epsData.data.length === 0) {
                await context.reply(`❌ Tidak dapat menemukan episode untuk ID tersebut.`);
                return;
            }

            let episodeListText =
                `╭ ┈──ׅ─┈─ׅ─┈─ׅ─┈─ׅ─\n` +
                `│   ---- *⫹ DAFTAR EPISODE LOKLOK ⫺* ----\n` +
                `│╭ ┈──ׅ───ׅ──ׅ─┈─ׅ─\n` +
                `││ *𖢷 ׁ 𖹭₊ Content ID:* ${contentId}\n` +
                `││ *𖢷 ׁ 𖹭₊ Total Ep :* ${epsData.total} Episode\n` +
                `│╰┈─ׅ──ֺ─ֺ──ׅ──ׅ─ֺ─ֺ\n` +
                `╰┈─ׅ──ֺ─ֺ───ׅ─  ׅ ⏝ׅ︶ ׅ 𝅄\n\n`;

            epsData.data.slice(0, 30).forEach((ep: LoklokEpisodeItem) => {
                episodeListText +=
                    `*${ep.name}* ${ep.isVip ? '👑 [VIP]' : '🆓 [FREE]'}\n` +
                    `› 🔗 Tonton: ${ep.watchUrl}\n\n`;
            });

            if (epsData.data.length > 30) {
                episodeListText += `_...dan ${epsData.data.length - 30} episode lainnya._\n`;
            }

            // Kirim full footer
            if (global.button && typeof global.button.send === 'function') {
                try {
                    await global.button.send(context, {
                        text: '',
                        footer: episodeListText.trim(),
                        buttons: []
                    }, { quote: context.raw as any });
                    return;
                } catch {
                    // Fallback
                }
            }

            await context.reply(episodeListText.trim());
            return;
        }

        // Default: Pencarian Film / Drama / Anime
        await context.reply(global.mess?.wait || '⏳ Mencari di Loklok...');

        const searchRes = await search(text, 6);
        if (!searchRes.status || searchRes.data.length === 0) {
            await context.reply(searchRes.message || `❌ Film/drama *"${text}"* tidak ditemukan di Loklok.`);
            return;
        }

        const items: LoklokSearchItem[] = searchRes.data;

        // Jika hasil >= 2, kirim Carousel interaktif
        if (items.length >= 2) {
            const cards = items.slice(0, 6).map((item, idx) => {
                const cover = item.coverHorizontal || item.coverVertical || '';
                const tags = item.tags.slice(0, 3).join(', ') || item.type;
                const desc = (item.introduction || 'Tonton sekarang secara gratis di Loklok.').replace(/\n+/g, ' ').slice(0, 95);

                return {
                    title: `🎬 #${idx + 1} ${item.title}`,
                    subtitle: `⭐ ${item.score || 'N/A'} • ${item.releaseYear} • ${tags}`,
                    body: `${desc}...\n\nTotal: ${item.episodesCount} Episode`,
                    image: cover,
                    buttons: [
                        {
                            type: 'url' as const,
                            text: '▶️ Nonton di Web',
                            url: item.watchUrl
                        },
                        {
                            type: 'reply' as const,
                            text: '📑 Cek Episode',
                            id: `${context.usedPrefix || '.'}loklok eps ${item.id} ${item.category}`
                        }
                    ]
                };
            });

            await sendCoroseul(context, {
                text: `🍿 *Hasil Pencarian Loklok:* "${text}"\n_Ditemukan ${items.length} judul rekomendasi_`,
                footer: 'Enami Asa Ai • Loklok Streaming',
                cards
            });
            return;
        }

        // Jika hanya 1 hasil
        const item = items[0];
        const singleText =
            `🍿 *${item.title}*\n\n` +
            `• *Tipe:* ${item.type}\n` +
            `• *Rilis:* ${item.releaseYear}\n` +
            `• *Rating:* ⭐ ${item.score || 'N/A'}\n` +
            `• *Total Episode:* ${item.episodesCount}\n` +
            `• *Kategori:* ${item.tags.join(', ') || '-'}\n\n` +
            `📝 *Sinopsis:*\n${item.introduction || 'Tidak ada deskripsi.'}\n\n` +
            `▶️ *Link Nonton:* ${item.watchUrl}\n` +
            `📑 *Ketik:* *${context.usedPrefix || '.'}loklok eps ${item.id} ${item.category}* untuk melihat episode`;

        const singleCover = item.coverVertical || item.coverHorizontal;
        if (singleCover) {
            await context.client.sendMessage(
                context.chatJid,
                {
                    image: { url: singleCover } as any,
                    caption: singleText
                },
                { quoted: context.raw as any }
            );
        } else {
            await context.reply(singleText);
        }
    }
};

export default handler;
