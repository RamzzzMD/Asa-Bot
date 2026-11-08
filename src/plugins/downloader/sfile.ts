import axios from 'axios';
import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { sfileSearch, sfileDownload, sfileUpload, getMimeTypeFromFilename } from '../../../scrape/sfile.js';

const handler: Plugin = {
    command: ['sfile', 'sfiledl', 'sfilemobi'],
    category: 'downloader',
    description: 'Pencarian, pengunduhan, dan pengunggahan file sfile.mobi / sfile.co',
    owner: false,
    premium: false,
    group: false,
    private: false,
    admin: false,
    botadmin: false,
    execute: async (context: PluginContext): Promise<void> => {
        const subCommand = (context.args[0] || '').toLowerCase().trim();
        const usedPrefix = context.usedPrefix || '.';

        if (subCommand === 'search' || subCommand === 'cari') {
            const query = context.args.slice(1).join(' ').trim();
            if (!query) {
                await context.reply(
                    `*Format Pencarian Sfile:*\n` +
                    `› *${usedPrefix}${context.command} search <kata kunci>*\n\n` +
                    `_Contoh: ${usedPrefix}${context.command} search whatsapp mod_`
                );
                return;
            }

            await context.reply(global.mess.wait);

            try {
                const results = await sfileSearch(query);
                if (results.length === 0) {
                    await context.reply(`❌ Tidak ditemukan file untuk query "*${query}*".`);
                    return;
                }

                const listItems = results.slice(0, 15);
                const sections = [
                    {
                        title: 'Hasil Pencarian Sfile',
                        rows: listItems.map((item, idx) => {
                            const cleanTitle = item.title.replace(/\s+/g, ' ').trim();
                            const displayTitle =
                                cleanTitle.length > 22 ? cleanTitle.slice(0, 22) + '...' : cleanTitle;
                            return {
                                id: `${usedPrefix}sfile dl ${item.url}`,
                                title: `${idx + 1}. ${displayTitle}`,
                                description: `Ukuran: ${item.size}${item.uploadDate ? ` | ${item.uploadDate}` : ''}`
                            };
                        })
                    }
                ];

                if (global.button && typeof global.button.list === 'function') {
                    await global.button.list(context, {
                        text: `Ditemukan *${results.length}* file untuk kata kunci: "*${query}*"`,
                        buttonText: 'Pilih File Untuk Download',
                        header: '*SFILE MOBI SEARCH*',
                        footer: 'Klik tombol di atas untuk memilih file yang ingin diunduh.',
                        sections
                    });
                    return;
                }

                let textList = `*Hasil Pencarian Sfile:*\nQuery: *${query}*\n\n`;
                listItems.forEach((item, idx) => {
                    textList += `*${idx + 1}. ${item.title}*\n`;
                    textList += `› Ukuran: ${item.size}\n`;
                    textList += `› Unduh: ${usedPrefix}sfile dl ${item.url}\n\n`;
                });
                await context.reply(textList.trim());
            } catch (err: any) {
                await context.reply(`❌ Terjadi kesalahan saat mencari: ${err.message || err}`);
            }
            return;
        }

        if (subCommand === 'dl' || subCommand === 'download') {
            const fileUrl = context.args[1] ? context.args[1].trim() : '';
            if (!fileUrl) {
                await context.reply(
                    `*Format Download Sfile:*\n` +
                    `› *${usedPrefix}${context.command} dl <url sfile>*\n\n` +
                    `_Contoh: ${usedPrefix}${context.command} dl https://sfile.co/duWeCpisFs3_`
                );
                return;
            }

            await context.reply(global.mess.wait);

            try {
                const fileInfo = await sfileDownload(fileUrl);
                const downloadRes = await axios.get(fileInfo.downloadUrl, {
                    headers: {
                        'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        Referer: 'https://sfile.co/'
                    },
                    responseType: 'arraybuffer',
                    timeout: 120000,
                    maxContentLength: 100 * 1024 * 1024,
                    validateStatus: () => true
                });

                if (downloadRes.status !== 200) {
                    throw new Error(`Server download merespon status ${downloadRes.status}`);
                }

                const buffer = Buffer.from(downloadRes.data);
                const mimetype = fileInfo.mimetype || getMimeTypeFromFilename(fileInfo.filename);

                if (mimetype.startsWith('image/')) {
                    await context.client.sendMessage(
                        context.chatJid,
                        {
                            image: buffer,
                            text: `*Sfile Download*\n› *Nama:* ${fileInfo.filename}\n› *Ukuran:* ${fileInfo.size}`
                        },
                        { quoted: context.raw }
                    );
                } else if (mimetype.startsWith('video/')) {
                    await context.client.sendMessage(
                        context.chatJid,
                        {
                            video: buffer,
                            text: `*Sfile Download*\n› *Nama:* ${fileInfo.filename}\n› *Ukuran:* ${fileInfo.size}`
                        },
                        { quoted: context.raw }
                    );
                } else if (mimetype.startsWith('audio/')) {
                    await context.client.sendMessage(
                        context.chatJid,
                        {
                            audio: buffer,
                            mimetype
                        },
                        { quoted: context.raw }
                    );
                } else {
                    await context.client.sendMessage(
                        context.chatJid,
                        {
                            document: buffer,
                            filename: fileInfo.filename,
                            mimetype
                        },
                        { quoted: context.raw }
                    );
                }
            } catch (err: any) {
                await context.reply(`❌ Gagal mengunduh file sfile: ${err.message || err}`);
            }
            return;
        }

        if (subCommand === 'upload' || subCommand === 'up') {
            const quoted = context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const targetMessage = quoted || context.event.message;

            const hasMedia = Boolean(
                targetMessage?.documentMessage ||
                targetMessage?.imageMessage ||
                targetMessage?.videoMessage ||
                targetMessage?.audioMessage ||
                targetMessage?.stickerMessage
            );

            if (!hasMedia) {
                await context.reply(
                    `*Format Upload Sfile:*\n` +
                    `› Reply pesan media (dokumen/gambar/video/audio) dengan perintah:\n` +
                    `› *${usedPrefix}${context.command} upload* [nama_file_opsional]`
                );
                return;
            }

            await context.reply(global.mess.wait);

            try {
                const buffer = await context.client.downloadMedia(targetMessage);
                if (!buffer || buffer.length === 0) {
                    throw new Error('Gagal mengunduh buffer media dari WhatsApp.');
                }

                let originalName = '';
                let detectedMime = 'application/octet-stream';

                if (targetMessage?.documentMessage) {
                    originalName = targetMessage.documentMessage.fileName || '';
                    detectedMime = targetMessage.documentMessage.mimetype || '';
                } else if (targetMessage?.imageMessage) {
                    detectedMime = targetMessage.imageMessage.mimetype || 'image/jpeg';
                    originalName = `image_${Date.now()}.jpg`;
                } else if (targetMessage?.videoMessage) {
                    detectedMime = targetMessage.videoMessage.mimetype || 'video/mp4';
                    originalName = `video_${Date.now()}.mp4`;
                } else if (targetMessage?.audioMessage) {
                    detectedMime = targetMessage.audioMessage.mimetype || 'audio/mp3';
                    originalName = `audio_${Date.now()}.mp3`;
                } else if (targetMessage?.stickerMessage) {
                    detectedMime = 'image/webp';
                    originalName = `sticker_${Date.now()}.webp`;
                }

                const customName = context.args.slice(1).join(' ').trim();
                const uploadName = customName || originalName || `file_${Date.now()}`;

                const result = await sfileUpload(buffer, uploadName, detectedMime);

                const responseText =
                    `✅ *Upload Sfile Berhasil!*\n\n` +
                    `› *Nama File:* ${result.fileName}\n` +
                    `› *Ukuran:* ${result.sizeLabel}\n` +
                    `› *Tautan:* ${result.shareUrl}`;

                await context.reply(responseText);
            } catch (err: any) {
                await context.reply(`❌ Gagal upload ke sfile: ${err.message || err}`);
            }
            return;
        }

        // Jika user langsung memasukkan URL sfile (misal .sfile https://sfile.co/...)
        const possibleUrl = context.args[0] || '';
        if (possibleUrl.includes('sfile.co') || possibleUrl.includes('sfile.mobi')) {
            return handler.execute({ ...context, args: ['dl', possibleUrl] });
        }

        await context.reply(
            `*PANDUAN PERINTAH SFILE*\n\n` +
            `1. *Pencarian File:*\n` +
            `   › *${usedPrefix}${context.command} search <query>*\n\n` +
            `2. *Download File:*\n` +
            `   › *${usedPrefix}${context.command} dl <url>*\n\n` +
            `3. *Upload File:*\n` +
            `   › Reply file dengan *${usedPrefix}${context.command} upload* [nama_file]`
        );
    }
};

export default handler;
