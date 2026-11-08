import axios from 'axios';
import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { scrapeMediafire, getMimeType } from '../../../scrape/mediafire.js';

const handler: Plugin = {
    command: ['mediafire', 'mf', 'mfdl'],
    category: 'downloader',
    description: 'Mengunduh file dari tautan MediaFire sesuai tipe aslinya (bukan .bin)',
    owner: false,
    premium: false,
    group: false,
    private: false,
    admin: false,
    botadmin: false,
    execute: async (context: PluginContext): Promise<void> => {
        let inputUrl = context.args[0] ? context.args[0].trim() : '';

        if (!inputUrl) {
            const quotedText =
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text;

            if (quotedText) {
                const match = quotedText.match(/https?:\/\/[^\s]+/i);
                if (match) {
                    inputUrl = match[0];
                }
            }
        }

        if (!inputUrl || (!inputUrl.includes('mediafire.com') && !inputUrl.includes('mf.me'))) {
            await context.reply(
                `*Format Penggunaan MediaFire:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} <url mediafire>*\n\n` +
                `_Contoh: ${context.usedPrefix || '.'}${context.command} https://www.mediafire.com/file/..._`
            );
            return;
        }

        const matchUrl = inputUrl.match(/https?:\/\/[^\s]+/i);
        const targetUrl = matchUrl ? matchUrl[0] : inputUrl;

        await context.reply(global.mess.wait);

        try {
            const data = await scrapeMediafire(targetUrl);

            const downloadRes = await axios.get(data.downloadUrl, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    Referer: targetUrl
                },
                responseType: 'arraybuffer',
                timeout: 180000,
                maxContentLength: 150 * 1024 * 1024,
                validateStatus: () => true
            });

            if (downloadRes.status !== 200) {
                throw new Error(`Server download merespon status ${downloadRes.status}`);
            }

            const buffer = Buffer.from(downloadRes.data);
            const rawMime = downloadRes.headers['content-type'];
            const headerMime = typeof rawMime === 'string' ? rawMime : undefined;
            const rawDisposition = downloadRes.headers['content-disposition'];
            const headerDisposition = typeof rawDisposition === 'string' ? rawDisposition : undefined;

            let realFilename = data.filename;
            if (headerDisposition) {
                const matchName =
                    headerDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
                if (matchName?.[1]) {
                    realFilename = decodeURIComponent(matchName[1]).trim();
                }
            }

            const finalMime = getMimeType(realFilename, headerMime);

            const infoCaption =
                `*MEDIAFIRE DOWNLOADER*\n\n` +
                `› *Nama File:* ${realFilename}\n` +
                `› *Ukuran:* ${data.size}\n` +
                `› *Mimetype:* ${finalMime}`;

            if (finalMime.startsWith('image/')) {
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        image: buffer,
                        text: infoCaption
                    },
                    { quoted: context.raw }
                );
            } else if (finalMime.startsWith('video/')) {
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        video: buffer,
                        text: infoCaption
                    },
                    { quoted: context.raw }
                );
            } else if (finalMime.startsWith('audio/')) {
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        audio: buffer,
                        mimetype: finalMime
                    },
                    { quoted: context.raw }
                );
            } else {
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        document: buffer,
                        filename: realFilename,
                        mimetype: finalMime
                    },
                    { quoted: context.raw }
                );
            }
        } catch (err: any) {
            await context.reply(`❌ Gagal mengunduh file MediaFire: ${err.message || err}`);
        }
    }
};

export default handler;
