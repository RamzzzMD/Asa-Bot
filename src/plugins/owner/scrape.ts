import path from 'node:path';
import type { Plugin, PluginContext } from '../../../types/plugin.js';
import {
    deployScrapeAndPlugin,
    extractScrapeInput,
    isLikelyRawScrapeCode
} from '../../lib/scrape-engine.js';

const handler: Plugin = {
    command: ['scrape', 'addscrape', 'autoscrape', 's2p', 'scrape2plugin'],
    category: 'owner',
    description: 'Menyimpan kode scrape ke folder scrape/ dan otomatis membuat plugin siap pakai (No APIKey)',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const rawArg = context.text.trim();
        const lowerArg = rawArg.toLowerCase();

        // Subcommand toggle untuk fitur auto-detect scrape tanpa prefix
        if (lowerArg === 'on' || lowerArg === 'enable' || lowerArg === 'aktif') {
            context.db.setSetting('bot', 'autoscrape', '1');
            await context.reply(
                `✅ *Auto-Scrape Detector Diaktifkan!*\n\n` +
                `Sekarang saat Owner mengirimkan kode scraper atau file \`.js\`/\`.ts\` ke ruang chat, *${context.config.botName}* akan otomatis menyimpannya ke folder \`scrape/\` dan membuatkan plugin di \`src/plugins/\`.`
            );
            return;
        }

        if (lowerArg === 'off' || lowerArg === 'disable' || lowerArg === 'nonaktif') {
            context.db.setSetting('bot', 'autoscrape', '0');
            await context.reply(
                `📴 *Auto-Scrape Detector Dinonaktifkan!*\n\n` +
                `Anda tetap dapat menambahkan scrape kapan saja menggunakan perintah *${context.usedPrefix}scrape* atau *${context.usedPrefix}addscrape*.`
            );
            return;
        }

        const quotedMsg =
            context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            (context.event as any)?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            null;

        const quotedText =
            quotedMsg?.conversation ||
            quotedMsg?.extendedTextMessage?.text ||
            quotedMsg?.documentMessage?.caption ||
            '';

        const isDirectDoc = Boolean(context.event.message?.documentMessage);
        const isQuotedDoc = Boolean(quotedMsg?.documentMessage);

        let docBuffer: Buffer | null = null;
        let docFileName = '';

        if (isDirectDoc) {
            try {
                docFileName = context.event.message?.documentMessage?.fileName || '';
                docBuffer = await context.client.downloadMedia(context.event);
            } catch {
                docBuffer = null;
            }
        } else if (isQuotedDoc) {
            try {
                docFileName = quotedMsg?.documentMessage?.fileName || '';
                docBuffer = await context.client.downloadMedia({ message: quotedMsg });
            } catch {
                docBuffer = null;
            }
        }

        const { hintName, hintCategory, code } = extractScrapeInput(
            rawArg,
            quotedText,
            docBuffer,
            docFileName
        );

        if (!code || code.length < 30 || (!isLikelyRawScrapeCode(code) && !/\b(function|export|module\.exports|axios|fetch|cheerio)\b/.test(code))) {
            const autoStatus = context.db.getSetting('bot', 'autoscrape') !== '0' ? '🟢 ON' : '🔴 OFF';
            await context.reply(
                `⚡ *AUTO SCRAPE-TO-PLUGIN (${context.config.botName})*\n` +
                `• *Status Auto-Detect:* ${autoStatus}\n` +
                `• *Owner:* ${context.config.ownerName}\n\n` +
                `📌 *Cara Penggunaan:*\n` +
                `1. *Kirim Langsung:* Kirimkan kode scrape atau file \`.js\`/\`.ts\` langsung ke chat (otomatis terdeteksi).\n` +
                `2. *Reply Kode/File:* Balas pesan berisi kode scrape dengan:\n` +
                `   › *${context.usedPrefix}scrape*\n` +
                `   › *${context.usedPrefix}scrape <nama>*\n` +
                `   › *${context.usedPrefix}scrape <kategori>/<nama>*\n` +
                `3. *Tulis Langsung:*\n` +
                `   › *${context.usedPrefix}scrape downloader/capcut <kode_scrape>*\n` +
                `4. *Pengaturan Auto-Detect:*\n` +
                `   › *${context.usedPrefix}autoscrape on / off*\n\n` +
                `📂 *Manajemen Scrape:*\n` +
                `› *${context.usedPrefix}listscrape* — Lihat semua file di \`scrape/\`\n` +
                `› *${context.usedPrefix}getscrape <nama>* — Ambil kode sumber scrape\n` +
                `› *${context.usedPrefix}delscrape <nama>* — Hapus file scrape`
            );
            return;
        }

        await context.reply(
            `⏳ *Sedang menganalisis & mengonversi kode scrape...*\n` +
            `_Menyimpan ke folder \`scrape/\` dan merakit plugin otomatis untuk ${context.config.botName}_`
        );

        try {
            const result = await deployScrapeAndPlugin(code, {
                hintName,
                hintCategory,
                registry: context.registry
            });

            const {
                analysis,
                scrapeRelPath,
                pluginRelPath,
                scrapeCode,
                pluginCode,
                generatorUsed,
                isUpdate,
                hotRegistered
            } = result;

            const cmdList = analysis.commands.map((c) => `${context.usedPrefix || '.'}${c}`).join(', ');
            const summary =
                `✅ *SCRAPE & PLUGIN BERHASIL ${isUpdate ? 'DIPERBARUI' : 'DIBUAT'}!*\n\n` +
                `╭──「 📋 *INFORMASI FITUR* 」\n` +
                `│ • *Nama Scrape:* \`${analysis.scrapeName}\`\n` +
                `│ • *Fungsi Utama:* \`${analysis.mainFunctionName}()\`\n` +
                `│ • *Kategori:* \`${analysis.category}\`\n` +
                `│ • *Mode Input:* \`${analysis.inputMode}\`\n` +
                `│ • *Command:* *${cmdList}*\n` +
                `├──「 📂 *LOKASI FILE* 」\n` +
                `│ • *File Scrape:* \`${scrapeRelPath}\`\n` +
                `│ • *File Plugin:* \`${pluginRelPath}\`\n` +
                `├──「 ⚙️ *ENGINE* 」\n` +
                `│ • *Generator:* ${generatorUsed}\n` +
                `│ • *Hot-Reload:* ${hotRegistered ? 'Aktif (Langsung Siap Pakai ✓)' : 'Tersimpan (Auto-Watch ✓)'}\n` +
                `╰───────────────\n\n` +
                `💡 *Coba sekarang:* Ketik *${context.usedPrefix || '.'}${analysis.commands[0]}*`;

            await context.client.sendMessage(
                context.chatJid,
                {
                    text: summary,
                    footer: `${context.config.botName} • ${context.config.ownerName}`,
                    buttons: [
                        {
                            type: 'copy',
                            text: '📋 Salin Plugin',
                            copyCode: pluginCode
                        },
                        {
                            type: 'copy',
                            text: '📋 Salin Scrape',
                            copyCode: scrapeCode
                        },
                        {
                            type: 'reply',
                            id: `${context.usedPrefix || '.'}${analysis.commands[0]}`,
                            text: `🚀 Tes ${context.usedPrefix || '.'}${analysis.commands[0]}`
                        }
                    ]
                },
                { quoted: context.raw }
            );
        } catch (err: any) {
            await context.reply(`❌ Gagal memproses kode scrape: ${err.message || err}`);
        }
    }
};

export default handler;

