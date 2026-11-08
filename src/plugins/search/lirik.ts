import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { searchLyrics } from '../../../scrape/lirik.js';

const handler: Plugin = {
    command: ['lirik'],
    category: 'search',
    description: 'Cari lirik lagu dari lrclib',
    execute: async (context: PluginContext): Promise<void> => {
        const query = context.text.trim();
        if (!query) {
            await context.reply(`Contoh: *${context.usedPrefix}${context.command} Coldplay Yellow*`);
            return;
        }

        await context.reply(global.mess?.wait || '⏳ Sedang mencari lirik lagu...');

        try {
            const results = await searchLyrics(query);
            if (!results || results.length === 0) {
                await context.reply(`❌ Lirik lagu untuk *"${query}"* tidak ditemukan.`);
                return;
            }

            const item = results.find(r => r.plainLyrics || r.syncedLyrics) || results[0];
            let lyrics = item.plainLyrics;
            if (!lyrics && item.syncedLyrics) {
                lyrics = item.syncedLyrics.replace(/\[\d+:\d+\.\d+\]\s*/g, '');
            }

            if (!lyrics || !lyrics.trim()) {
                await context.reply(`❌ Lirik untuk lagu *"${item.trackName}" - ${item.artistName}* belum tersedia.`);
                return;
            }

            const message =
                `🎵 *${item.trackName.toUpperCase()}*\n` +
                `🎤 *Artis:* ${item.artistName}\n` +
                `💿 *Album:* ${item.albumName || '-'}\n\n` +
                `────────────────────\n\n` +
                `${lyrics.trim()}\n\n` +
                `────────────────────\n` +
                `_Enami Asa Ai - Lyrics Search_`;

            await context.reply(message);
        } catch (err: any) {
            await context.reply(`❌ Terjadi kesalahan: ${err.message || 'Gagal mencari lirik.'}`);
        }
    }
};

export default handler;
