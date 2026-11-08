import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { download, getLyrics } from '../../../scrape/ytmusic.js';

const handler: Plugin = {
    command: ['play', 'ytplay', 'ytmp3', 'ytmusic', 'yta', 'song'],
    category: 'downloader',
    description: 'Putar dan unduh lagu MP3 langsung dari judul lagu atau URL YouTube / YouTube Music',
    execute: async (context: PluginContext): Promise<void> => {
        let query = context.text.trim();

        if (!query) {
            const quotedText =
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
                '';
            if (quotedText) {
                query = quotedText.trim();
            }
        }

        if (!query) {
            await context.reply(
                `🎵 *YOUTUBE MUSIC PLAY & MP3 DOWNLOADER*\n\n` +
                `⚙️ *Cara Penggunaan:*\n` +
                `› *${context.usedPrefix}${context.command} <judul lagu / nama artis>*\n` +
                `› *${context.usedPrefix}${context.command} <url youtube / youtube music>*\n\n` +
                `📌 *Contoh:*\n` +
                `› *${context.usedPrefix}${context.command} Bruno Mars Die With A Smile*\n` +
                `› *${context.usedPrefix}${context.command} https://music.youtube.com/watch?v=...*`
            );
            return;
        }

        await context.reply(global.mess?.wait || `🎧 Sedang mencari & menyiapkan lagu *"${query}"*...`);

        try {
            const trackData = await download(query, {
                whatsapp: true,
                format: 'mp3',
                buffer: true
            });

            const ytUrl = `https://music.youtube.com/watch?v=${trackData.videoId}`;
            let lyricsSnippet = '';
            try {
                const lyr = await getLyrics(trackData.videoId);
                if (lyr?.lyrics) {
                    const previewLines = lyr.lyrics.split('\n').slice(0, 6).join('\n').trim();
                    if (previewLines) {
                        lyricsSnippet = `\n🎼 *Cuplikan Lirik:*\n_${previewLines}..._\n`;
                    }
                }
            } catch {}

            const caption =
                `🎵 *YOUTUBE MUSIC PLAYER*\n\n` +
                `• *Judul:* ${trackData.title}\n` +
                `• *Artis:* ${trackData.artist}\n` +
                (trackData.duration ? `• *Durasi:* ${trackData.duration}\n` : '') +
                (trackData.formattedSize ? `• *Ukuran:* ${trackData.formattedSize}\n` : '') +
                `• *Format:* ${trackData.format.toUpperCase()} (${trackData.bitrate ? Math.round(trackData.bitrate / 1000) + ' kbps' : 'HQ'})\n` +
                `• *Link:* ${ytUrl}\n` +
                lyricsSnippet +
                `\n_${context.config.botName} • YouTube Music Engine_`;

            if (trackData.thumbnail) {
                try {
                    await context.client.sendMessage(
                        context.chatJid,
                        {
                            image: { url: trackData.thumbnail },
                            caption
                        },
                        { quoted: context.raw }
                    );
                } catch {
                    await context.reply(caption);
                }
            } else {
                await context.reply(caption);
            }

            if (trackData.buffer && Buffer.isBuffer(trackData.buffer) && trackData.buffer.length > 0) {
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        audio: trackData.buffer,
                        mimetype: 'audio/mpeg',
                        fileName: trackData.filename,
                        ptt: false
                    },
                    { quoted: context.raw }
                );
            } else if (trackData.downloadUrl) {
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        audio: { url: trackData.downloadUrl },
                        mimetype: 'audio/mpeg',
                        fileName: trackData.filename,
                        ptt: false
                    },
                    { quoted: context.raw }
                );
            }
        } catch (err: any) {
            await context.reply(`❌ Gagal memutar/mengunduh lagu: ${err.message || err}`);
        }
    }
};

export default handler;

