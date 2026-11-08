import type { Plugin, PluginContext } from '../../../types/plugin.js';
import {
    search,
    getLyrics,
    getCharts,
    getAlbum,
    getArtist,
    getPlaylist,
    getExplore
} from '../../../scrape/ytmusic.js';

const handler: Plugin = {
    command: ['ytmsearch', 'ytm', 'ytlyrics', 'ytcharts', 'ytalbum', 'ytartist', 'ytplaylist', 'ytexplore'],
    category: 'search',
    description: 'Cari lagu, lirik, tangga lagu (charts), album, artis, dan playlist di YouTube Music',
    execute: async (context: PluginContext): Promise<void> => {
        const cmd = context.command.toLowerCase();
        const input = context.text.trim();

        // 1. Top Charts
        if (cmd === 'ytcharts') {
            await context.reply(global.mess?.wait || '⏳ Mengambil tangga lagu & artis teratas YouTube Music...');
            try {
                const charts = await getCharts(input || 'US');
                const top = (charts.topArtists || []).slice(0, 15);
                if (top.length === 0) {
                    await context.reply('❌ Tidak dapat memuat data tangga lagu saat ini.');
                    return;
                }
                const list = top
                    .map((a: any) => `*#${a.rank}.* ${a.name} (${a.subscribers || '-'}) — \`${a.browseId || '-'}\``)
                    .join('\n');
                await context.reply(
                    `🏆 *TOP ARTISTS YOUTUBE MUSIC (${charts.country})*\n\n` +
                    `${list}\n\n` +
                    `_${context.config.botName} • YouTube Music Charts_`
                );
            } catch (err: any) {
                await context.reply(`❌ Gagal mengambil chart: ${err.message || err}`);
            }
            return;
        }

        // 2. Explore
        if (cmd === 'ytexplore') {
            await context.reply(global.mess?.wait || '⏳ Mengambil katalog eksplorasi YouTube Music...');
            try {
                const exp = await getExplore();
                const cats = (exp.categories || []).slice(0, 5);
                if (cats.length === 0) {
                    await context.reply('❌ Tidak dapat memuat data eksplorasi.');
                    return;
                }
                const body = cats
                    .map((cat: any) => {
                        const items = (cat.items || [])
                            .slice(0, 5)
                            .map((it: any, idx: number) => `  ${idx + 1}. *${it.title}* ${it.subtitle ? `(${it.subtitle})` : ''}`)
                            .join('\n');
                        return `📂 *${cat.title}*\n${items}`;
                    })
                    .join('\n\n');

                await context.reply(
                    `🧭 *YOUTUBE MUSIC EXPLORE*\n\n${body}\n\n_${context.config.botName} • YouTube Music_`
                );
            } catch (err: any) {
                await context.reply(`❌ Gagal mengambil eksplorasi: ${err.message || err}`);
            }
            return;
        }

        if (!input) {
            await context.reply(
                `🎶 *YOUTUBE MUSIC SUITE*\n\n` +
                `⚙️ *Daftar Perintah:*\n` +
                `› *${context.usedPrefix}ytm <judul lagu>* — Cari lagu, video, album & artis\n` +
                `› *${context.usedPrefix}ytlyrics <judul / url>* — Cari lirik lagu resmi\n` +
                `› *${context.usedPrefix}ytcharts* — Tangga artis terpopuler\n` +
                `› *${context.usedPrefix}ytexplore* — Tren & rilis terbaru\n` +
                `› *${context.usedPrefix}ytalbum <browseId / url>* — Detail album\n` +
                `› *${context.usedPrefix}ytartist <browseId / url>* — Profil & lagu populer artis\n` +
                `› *${context.usedPrefix}ytplaylist <browseId / url>* — Daftar lagu playlist\n` +
                `› *${context.usedPrefix}play <judul lagu>* — Unduh MP3 langsung`
            );
            return;
        }

        // 3. Lyrics
        if (cmd === 'ytlyrics') {
            await context.reply(global.mess?.wait || `⏳ Mencari lirik lagu *"${input}"*...`);
            try {
                const res = await getLyrics(input);
                if (!res.lyrics) {
                    await context.reply(`❌ Lirik untuk *"${input}"* tidak ditemukan di YouTube Music.`);
                    return;
                }
                await context.reply(
                    `🎼 *YOUTUBE MUSIC LYRICS*\n\n` +
                    `${res.lyrics.trim()}\n\n` +
                    (res.source ? `📌 _${res.source}_\n` : '') +
                    `_${context.config.botName} • YouTube Music_`
                );
            } catch (err: any) {
                await context.reply(`❌ Gagal mengambil lirik: ${err.message || err}`);
            }
            return;
        }

        // 4. Album
        if (cmd === 'ytalbum') {
            await context.reply(global.mess?.wait || '⏳ Mengambil informasi album...');
            try {
                const album = await getAlbum(input);
                const tracks = (album.tracks || [])
                    .slice(0, 20)
                    .map((t: any) => `*${t.trackNumber}.* ${t.title} (${t.duration || '-'})`)
                    .join('\n');
                await context.reply(
                    `💿 *ALBUM: ${album.title || '-'}*\n` +
                    `• *Info:* ${album.subtitle || '-'}\n` +
                    `• *Total Lagu:* ${album.totalTracks}\n\n` +
                    `${tracks}\n\n` +
                    `_${context.config.botName} • YouTube Music_`
                );
            } catch (err: any) {
                await context.reply(`❌ Gagal memuat album: ${err.message || err}`);
            }
            return;
        }

        // 5. Artist
        if (cmd === 'ytartist') {
            await context.reply(global.mess?.wait || '⏳ Mengambil profil artis...');
            try {
                const artist = await getArtist(input);
                const topSongs = (artist.topSongs || [])
                    .slice(0, 10)
                    .map((s: any, idx: number) => `*${idx + 1}.* ${s.title} (${s.plays || s.duration || '-'})`)
                    .join('\n');
                await context.reply(
                    `🎤 *ARTIS: ${artist.name || '-'}*\n\n` +
                    (artist.description ? `${artist.description.slice(0, 350)}...\n\n` : '') +
                    `🔥 *Lagu Terpopuler:*\n${topSongs || '-'}\n\n` +
                    `_${context.config.botName} • YouTube Music_`
                );
            } catch (err: any) {
                await context.reply(`❌ Gagal memuat profil artis: ${err.message || err}`);
            }
            return;
        }

        // 6. Playlist
        if (cmd === 'ytplaylist') {
            await context.reply(global.mess?.wait || '⏳ Mengambil daftar lagu playlist...');
            try {
                const pl = await getPlaylist(input);
                const tracks = (pl.tracks || [])
                    .slice(0, 20)
                    .map((t: any) => `*${t.position}.* ${t.title} (${t.duration || '-'})`)
                    .join('\n');
                await context.reply(
                    `📂 *PLAYLIST: ${pl.title || '-'}*\n` +
                    `• *Info:* ${pl.subtitle || '-'}\n` +
                    `• *Total Lagu:* ${pl.totalTracks}\n\n` +
                    `${tracks}\n\n` +
                    `_${context.config.botName} • YouTube Music_`
                );
            } catch (err: any) {
                await context.reply(`❌ Gagal memuat playlist: ${err.message || err}`);
            }
            return;
        }

        // 7. Default Search (ytm / ytmsearch)
        await context.reply(global.mess?.wait || `🔍 Mencari *"${input}"* di YouTube Music...`);
        try {
            const res = await search(input);
            const songs = (res.songs || []).slice(0, 8);

            if (songs.length === 0 && !res.topResult) {
                await context.reply(`❌ Tidak ditemukan hasil untuk *"${input}"*.`);
                return;
            }

            let textOut = `🎶 *HASIL PENCARIAN YOUTUBE MUSIC*\n• *Query:* ${input}\n\n`;

            if (res.topResult?.title) {
                textOut +=
                    `⭐ *Top Result:* ${res.topResult.title}\n` +
                    `   ${res.topResult.subtitle || ''}\n` +
                    (res.topResult.videoId ? `   🔗 https://music.youtube.com/watch?v=${res.topResult.videoId}\n\n` : '\n');
            }

            if (songs.length > 0) {
                textOut += `🎵 *Daftar Lagu:*\n`;
                songs.forEach((s: any, idx: number) => {
                    const artistNames = (s.artists || []).map((a: any) => a.name).join(', ') || '-';
                    textOut +=
                        `*${idx + 1}. ${s.title}*\n` +
                        `   👤 Artis: ${artistNames}\n` +
                        (s.duration ? `   ⏱️ Durasi: ${s.duration}\n` : '') +
                        (s.videoId ? `   🔗 https://music.youtube.com/watch?v=${s.videoId}\n` : '') +
                        '\n';
                });
            }

            textOut += `💡 _Ketik *${context.usedPrefix}play ${input}* untuk mengunduh audio MP3._`;
            await context.reply(textOut.trim());
        } catch (err: any) {
            await context.reply(`❌ Gagal mencari di YouTube Music: ${err.message || err}`);
        }
    }
};

export default handler;

